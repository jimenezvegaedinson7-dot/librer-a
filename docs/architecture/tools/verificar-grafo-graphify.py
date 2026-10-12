"""Comprueba estructura, relaciones de integración y ausencia de secretos de entorno."""
import hashlib
import json
import os
import sys
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'graphify-out'


def main():
    text = (OUT / 'graph.json').read_text(encoding='utf-8')
    data = json.loads(text)
    manifest = json.loads((OUT / 'manifest-proyecto.json').read_text(encoding='utf-8'))
    ids = [n['id'] for n in data['nodes']]
    assert len(ids) == len(set(ids)), 'IDs de nodos repetidos'
    id_set = set(ids)
    assert all(e['source'] in id_set and e['target'] in id_set for e in data['links']), 'Relaciones sin nodo'
    assert all(e.get('confidence') == 'EXTRACTED' for e in data['links']), 'Quedaron relaciones heurísticas'
    assert len(data['nodes']) == manifest['nodes']
    assert len(data['links']) == manifest['edges']
    assert sum(n['id'].startswith('endpoint:') for n in data['nodes']) == manifest['endpoints']
    assert sum(n['id'].startswith('tabla:') for n in data['nodes']) == manifest['tables']
    index = json.loads((ROOT / 'docs/architecture/08-CODE-INDEX.json').read_text(encoding='utf-8'))
    assert manifest['tables'] == len(index['database']['declaredTables'])
    for method in ['GET', 'PUT', 'DELETE']:
        endpoint = next(n for n in data['nodes'] if n.get('label') == method + ' /api/asistente/memoria')
        assert endpoint.get('auth') == 'JWT + cliente', 'Permiso incorrecto en memoria del asistente'
    for n in data['nodes']:
        source = n.get('source_file', '')
        if source:
            assert (ROOT / source).is_file(), f'Fuente inexistente: {source}'
        assert '.env' not in source.split('/'), 'Archivo sensible incluido'
    graph = nx.DiGraph()
    graph.add_nodes_from(ids)
    graph.add_edges_from((e['source'], e['target']) for e in data['links'])
    email_screen = next(n['id'] for n in data['nodes'] if n.get('source_file') == 'flutter_app/lib/screens/verificacion_email_screen.dart' and n.get('label') == 'verificacion_email_screen.dart')
    assert graph.has_edge(email_screen, 'endpoint:POST /api/auth/verificar-email'), 'Falta verificación de email Flutter'
    checkout_screen = next(n['id'] for n in data['nodes'] if n.get('source_file') == 'flutter_app/lib/screens/entrega_y_pago_screen.dart' and n.get('label') == 'entrega_y_pago_screen.dart')
    assert graph.has_edge(checkout_screen, 'endpoint:POST /api/pagos/crear-orden'), 'Falta creación de orden Flutter'
    for client in ['flutter_app/lib/screens/mis_compras_screen.dart', 'frontend/src/public-site/tienda/CheckoutPage.jsx', 'frontend/src/features/pedidos/PedidosPage.jsx']:
        # Graphify consolida un nodo de archivo con su equivalente del AST;
        # su ID canónico puede cambiar, pero fuente y etiqueta se conservan.
        source = next(n['id'] for n in data['nodes'] if n.get('source_file') == client and n.get('label') == Path(client).name)
        path = nx.shortest_path(graph, source, 'tabla:ventas')
        print(f'Conexión verificada: {client} → ventas ({len(path) - 1} relaciones)')
    for output in ['graph.json', 'graph.html', 'MAPA-CEREBRO.html', 'GRAPH_REPORT.md']:
        content = (OUT / output).read_text(encoding='utf-8')
        for key in ['RENDER_API_KEY', 'VERCEL_TOKEN', 'DATABASE_URL', 'JWT_SECRET', 'CLOUDINARY_API_SECRET']:
            value = os.environ.get(key)
            assert not value or len(value) < 8 or value not in content, f'Secreto de entorno en {output}'
    for html in ['graph.html', 'MAPA-CEREBRO.html']:
        content = (OUT / html).read_text(encoding='utf-8')
        assert '<script src="https://' not in content, f'Biblioteca remota en {html}'
    changed = [rel for rel, digest in manifest['source_hashes'].items() if hashlib.sha256((ROOT / rel).read_bytes()).hexdigest() != digest]
    print(f'Grafo válido: {manifest["files"]} archivos, {manifest["nodes"]} nodos, {manifest["edges"]} relaciones.')
    print(f'Endpoints: {manifest["endpoints"]}; tablas: {manifest["tables"]}; visores offline: 2.')
    print(f'Archivos cambiados desde la captura: {len(changed)}.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
