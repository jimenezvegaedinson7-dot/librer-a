"""Grafo local del código y de los índices de arquitectura; nunca consulta producción.

Ejecutar con el intérprete que contiene graphifyy:
    python docs/architecture/tools/generar-grafo-graphify.py --detectar
    python docs/architecture/tools/generar-grafo-graphify.py
"""
import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'graphify-out'
INDEX = ROOT / 'docs/architecture/08-CODE-INDEX.json'
API_MAP = ROOT / 'docs/architecture/05-API-MAP.md'
SCOPES = ('backend/src/', 'frontend/src/', 'flutter_app/lib/')


def save(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')


def selected():
    index = json.loads(INDEX.read_text(encoding='utf-8'))
    records = {r['file']: r for r in index['files'] if r['file'].startswith(SCOPES) or r['file'] == 'backend/server.js'}
    # La cadena de estilos no forma parte del índice JS/Dart.
    for name in ('index.css', 'styles/paleta-editorial.css', 'styles/theme.css', 'styles/panel-editorial.css', 'styles/panel-formal.css', 'public-site/public-site.css', 'public-site/tema-editorial.css'):
        rel = 'frontend/src/' + name
        if (ROOT / rel).is_file():
            records.setdefault(rel, {'file': rel, 'imports': [], 'endpoints': []})
    for rel in records:
        if not (ROOT / rel).is_file():
            raise ValueError(f'Índice desactualizado: {rel}')
    return index, records


def sector(rel):
    if rel.startswith('backend/'):
        return 'API / Backend'
    if rel.startswith('flutter_app/'):
        return 'App Flutter'
    if rel.startswith('frontend/src/public-site/'):
        return 'Tienda web'
    if rel.startswith('frontend/src/features/'):
        return 'Panel administrativo'
    return 'Web / componentes compartidos'


def detect_scope():
    _, records = selected()
    OUT.mkdir(exist_ok=True)
    words = sum(len((ROOT / rel).read_text(encoding='utf-8').split()) for rel in records)
    snapshot = {rel: hashlib.sha256((ROOT / rel).read_bytes()).hexdigest() for rel in records}
    counts = Counter(sector(rel) for rel in records)
    data = {'scan_root': str(ROOT), 'scope': list(SCOPES), 'total_files': len(records), 'total_words': words,
            'files': {'code': [str(ROOT / rel) for rel in sorted(records)]}, 'source_hashes': snapshot,
            'sector_counts': dict(counts), 'excluded': ['.env', 'credenciales', 'datos de producción', 'node_modules', 'builds', 'tests', 'medios'],
            'mode': 'AST local + relaciones extraídas de los índices de arquitectura'}
    save('.graphify_detect.json', data)
    (OUT / '.graphify_python').write_text(sys.executable, encoding='utf-8')
    (OUT / '.graphify_root').write_text(str(ROOT), encoding='utf-8')
    print(f'Corpus: {len(records)} archivos · ~{words:,} palabras')
    for name, count in counts.items():
        print(f'  {name}: {count} archivos')
    if len(records) > 500 or words > 2_000_000:
        raise ValueError('El alcance supera el límite de esta extracción; dividir antes de continuar')


def canonical(endpoint):
    return re.sub(r':[A-Za-z_][A-Za-z0-9_]*', ':param', endpoint)


def build():
    from graphify.extract import extract
    from graphify.build import build_from_json
    from graphify.cluster import cluster, score_all
    from graphify.analyze import god_nodes, surprising_connections, suggest_questions
    from graphify.report import generate
    from graphify.export import to_json

    index, records = selected()
    detection = json.loads((OUT / '.graphify_detect.json').read_text(encoding='utf-8'))
    # Evita mezclar una detección con un árbol de trabajo que cambió después.
    for rel, digest in detection['source_hashes'].items():
        if hashlib.sha256((ROOT / rel).read_bytes()).hexdigest() != digest:
            raise ValueError(f'El código cambió durante la generación: {rel}. Repetir --detectar.')

    js = [ROOT / rel for rel in records if Path(rel).suffix in {'.js', '.jsx'}]
    ast = extract(js, cache_root=ROOT, root=ROOT, max_workers=2)
    nodes = {n['id']: dict(n) for n in ast['nodes']}
    # Las heurísticas de resolución de llamadas homónimas pueden unir módulos
    # no relacionados. El mapa principal conserva solo evidencia EXTRACTED.
    inferred = sum(e.get('confidence') in {'INFERRED', 'AMBIGUOUS'} for e in ast['edges'])
    edges = [e for e in ast['edges'] if e.get('confidence') not in {'INFERRED', 'AMBIGUOUS'}]

    def node(node_id, label, source, kind='file', **attrs):
        nodes.setdefault(node_id, {'id': node_id, 'label': label, 'type': kind, 'file_type': 'code',
                                  'source_file': source, 'source_location': 'L1', '_origin': 'architecture-index', **attrs})
        return node_id

    def edge(a, b, relation, source, location='L1'):
        edges.append({'source': a, 'target': b, 'relation': relation, 'confidence': 'EXTRACTED',
                      'source_file': source, 'source_location': location, '_origin': 'architecture-index'})

    file_ids = {rel: node('archivo:' + rel, Path(rel).name, rel, sector=sector(rel)) for rel in records}
    for n in list(nodes.values()):
        rel = str(n.get('source_file', '')).replace('\\', '/')
        if rel in file_ids and n['id'] != file_ids[rel]:
            n['sector'] = sector(rel)
            edge(file_ids[rel], n['id'], 'contains_symbol', rel, n.get('source_location', 'L1'))
    for rel, record in records.items():
        for target in record.get('imports', []):
            if target in file_ids:
                edge(file_ids[rel], file_ids[target], 'imports', rel)
        content = (ROOT / rel).read_text(encoding='utf-8')
        if rel.endswith('.dart'):
            # Dart: clases e imports comprobables; no inventar llamadas entre métodos.
            for match in re.finditer(r'\bclass\s+(\w+)', content):
                line = content[:match.start()].count('\n') + 1
                ident = node(f'dart:{rel}:{match.group(1)}', match.group(1), rel, 'class', sector=sector(rel))
                nodes[ident]['source_location'] = f'L{line}'
                edge(file_ids[rel], ident, 'declares_class', rel, f'L{line}')
        if rel.endswith('.css') or rel.endswith('/main.jsx'):
            pattern = r'@import\s+["\']([^"\']+)["\']' if rel.endswith('.css') else r'import\s+["\']([^"\']+)["\']'
            for match in re.finditer(pattern, content):
                target = (ROOT / rel).parent / match.group(1)
                if target.is_file() and target.resolve().is_relative_to(ROOT):
                    target_rel = target.resolve().relative_to(ROOT).as_posix()
                    if target_rel in file_ids:
                        edge(file_ids[rel], file_ids[target_rel], 'imports_style', rel, f'L{content[:match.start()].count(chr(10)) + 1}')

    # Endpoints: nombres de parámetros normalizados para unir web/app con API.
    api_ids = {}
    for line_number, line in enumerate(API_MAP.read_text(encoding='utf-8').splitlines(), 1):
        if not re.match(r'^\| (GET|POST|PUT|PATCH|DELETE) \|', line):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        endpoint = cells[0] + ' ' + cells[1].strip('`')
        key = canonical(endpoint)
        api_id = node('endpoint:' + key, endpoint, API_MAP.relative_to(ROOT).as_posix(), 'endpoint', sector='API / Backend', auth=cells[6])
        api_ids[key] = api_id
        controller = cells[2].split('#')[0]
        target = 'backend/src/' + controller if controller.startswith('controllers/') else 'backend/server.js'
        if target in file_ids:
            edge(api_id, file_ids[target], 'handled_by', 'docs/architecture/05-API-MAP.md', f'L{line_number}')
        for cell, prefix in ((cells[4], 'frontend/src/'), (cells[5], 'flutter_app/lib/')):
            for consumer in cell.split('<br>'):
                candidate = prefix + consumer.strip('` ')
                if candidate in file_ids:
                    edge(file_ids[candidate], api_id, 'uses_api', 'docs/architecture/05-API-MAP.md', f'L{line_number}')
    for rel, record in records.items():
        for endpoint in record.get('endpoints', []):
            api_id = api_ids.get(canonical(endpoint))
            if api_id:
                relation = 'defines_endpoint' if '/routes/' in rel or rel == 'backend/server.js' else 'uses_api' if not rel.startswith('backend/') else 'handles_endpoint'
                edge(file_ids[rel], api_id, relation, 'docs/architecture/08-CODE-INDEX.json')
    for route in index['frontendRoutes']:
        rel = route.get('file')
        if rel in file_ids:
            route_id = node('pagina:' + route['path'], 'Página ' + route['path'], 'frontend/src/routes/AppRouter.jsx', 'route', sector=sector(rel))
            edge(route_id, file_ids[rel], 'renders_page', 'docs/architecture/08-CODE-INDEX.json')
            edge(file_ids['frontend/src/routes/AppRouter.jsx'], route_id, 'defines_page', 'frontend/src/routes/AppRouter.jsx')

    # Tablas del esquema local, sin leer ninguna fila de la base de producción.
    schema_file = 'backend/database/schema.sql'
    schema = (ROOT / schema_file).read_text(encoding='utf-8')
    tables = set(re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?(\w+)', schema, re.I))
    for table in sorted(tables):
        node('tabla:' + table, 'Tabla ' + table, schema_file, 'table', sector='Base de datos')
    for rel in records:
        if not rel.startswith('backend/src/models/'):
            continue
        content = (ROOT / rel).read_text(encoding='utf-8')
        for match in re.finditer(r'\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+([a-z_][a-z0-9_]*)', content, re.I):
            if match.group(1).lower() in tables:
                edge(file_ids[rel], 'tabla:' + match.group(1).lower(), 'queries_table', rel, f'L{content[:match.start()].count(chr(10)) + 1}')

    result = {'nodes': list(nodes.values()), 'edges': edges, 'input_tokens': 0, 'output_tokens': 0}
    graph = build_from_json(result, directed=True, root=ROOT)
    communities = cluster(graph)
    cohesion = score_all(graph, communities)
    labels = {}
    for cid, ids in communities.items():
        names = Counter(graph.nodes[ident].get('sector', 'Dependencias compartidas') for ident in ids)
        modules = Counter()
        for ident in ids:
            path = str(graph.nodes[ident].get('source_file', '')).replace('\\', '/')
            if '/features/' in path:
                modules[path.split('/features/', 1)[1].split('/')[0]] += 1
            elif path.startswith('backend/src/'):
                module = Path(path).name.split('.')[0].replace('controller', '').replace('model', '')
                if module:
                    modules[module] += 1
            elif '/screens/' in path:
                modules[Path(path).stem.replace('_screen', '')] += 1
            elif '/public-site/' in path:
                modules[path.split('/public-site/', 1)[1].split('/')[0].split('.')[0]] += 1
        module_text = ' / '.join(name for name, _ in modules.most_common(2))
        labels[cid] = names.most_common(1)[0][0] + (' · ' + module_text if module_text else '')
    gods = god_nodes(graph)
    surprises = surprising_connections(graph, communities)
    questions = suggest_questions(graph, communities, labels)
    token_cost = {'input': 0, 'output': 0}
    report = generate(graph, communities, cohesion, labels, gods, surprises, detection, token_cost, str(ROOT), suggested_questions=questions)
    notice = f'> Alcance: código actual, incluidos cambios locales sin commit. Extracción AST de JavaScript; Flutter e integración API complementadas con índices estáticos. No contiene datos de producción ni credenciales. Las relaciones reflejan evidencia estática, no llamadas observadas en ejecución. Se excluyeron {inferred} enlaces heurísticos INFERRED/AMBIGUOUS para no presentar coincidencias de nombres como dependencias confirmadas.\n\n'
    (OUT / 'GRAPH_REPORT.md').write_text(notice + report, encoding='utf-8')
    to_json(graph, communities, str(OUT / 'graph.json'), force=True, community_labels=labels)
    save('.graphify_labels.json', labels)
    save('.graphify_analysis.json', {'communities': communities, 'cohesion': cohesion, 'gods': gods, 'surprises': surprises, 'questions': questions})
    save('manifest-proyecto.json', {'generated': datetime.now(timezone.utc).isoformat(), 'source_hashes': detection['source_hashes'],
                                  'files': len(records), 'nodes': graph.number_of_nodes(), 'edges': graph.number_of_edges(),
                                  'communities': len(communities), 'endpoints': len(api_ids), 'tables': len(tables), 'inferred_excluded': inferred, 'mode': detection['mode']})
    cost_path = OUT / 'cost.json'
    cost = json.loads(cost_path.read_text(encoding='utf-8')) if cost_path.exists() else {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}
    cost['runs'].append({'date': datetime.now(timezone.utc).isoformat(), 'scope': 'proyecto', 'input_tokens': 0, 'output_tokens': 0})
    save('cost.json', cost)
    print(f'Grafo: {graph.number_of_nodes()} nodos · {graph.number_of_edges()} relaciones · {len(communities)} comunidades')
    print(f'Conexiones compartidas: {len(api_ids)} endpoints · {len(tables)} tablas. Tokens LLM: 0.')
    if graph.number_of_nodes() > 5000:
        print('El grafo supera 5.000 nodos: usar vista agregada por comunidades en la exportación HTML.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--detectar', action='store_true')
    args = parser.parse_args()
    detect_scope() if args.detectar else build()
