"""Empaqueta los visores exportados por Graphify para abrirlos sin conexión."""
import base64
import hashlib
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'graphify-out'
ASSETS = OUT / 'assets'


def download(url, name, expected_hash=None):
    # En las actualizaciones automáticas se reutiliza la copia local (sin red)
    # siempre que conserve la integridad esperada.
    local = ASSETS / name
    if local.is_file():
        if not expected_hash or base64.b64encode(hashlib.sha384(local.read_bytes()).digest()).decode('ascii') == expected_hash:
            print(f'Biblioteca local reutilizada: {name}')
            return
    request = Request(url, headers={'User-Agent': 'Graphify-Libreria/1.0'})
    with urlopen(request, timeout=40) as response:
        content = response.read()
    if expected_hash:
        actual = base64.b64encode(hashlib.sha384(content).digest()).decode('ascii')
        if actual != expected_hash:
            raise ValueError(f'La integridad SHA-384 no coincide: {name}')
    (ASSETS / name).write_bytes(content)
    print(f'Biblioteca local: {name} ({len(content):,} bytes)')


def main():
    if not (OUT / 'graph.html').is_file() or not (OUT / 'MAPA-CEREBRO.html').is_file():
        raise ValueError('Exportar ambos HTML de Graphify antes de empaquetarlos')
    ASSETS.mkdir(exist_ok=True)
    graph = (OUT / 'graph.html').read_text(encoding='utf-8')
    tree = (OUT / 'MAPA-CEREBRO.html').read_text(encoding='utf-8')
    download('https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js', 'vis-network.min.js',
             'Ux6phic9PEHJ38YtrijhkzyJ8yQlH8i/+buBR8s3mAZOJrP1gwyvAcIYl3GWtpX1')
    download('https://d3js.org/d3.v7.min.js', 'd3.v7.min.js')
    graph = re.sub(r'<script src="https://unpkg.com/vis-network[^>]+></script>', '<script src="./assets/vis-network.min.js"></script>', graph)
    tree = tree.replace('https://d3js.org/d3.v7.min.js', './assets/d3.v7.min.js')
    graph = graph.replace('<html lang="en">', '<html lang="es">').replace('<title>graphify - graphify-out/graph.html</title>', '<title>Librería del Saber · Cerebro Graphify</title>')
    graph = graph.replace('Search nodes...', 'Buscar archivos, funciones o endpoints...').replace('<h3>Node Info</h3>', '<h3>Detalles del nodo</h3>').replace('Click a node to inspect it', 'Selecciona un nodo para ver sus conexiones').replace('<h3>Communities</h3>', '<h3>Módulos conectados</h3>').replace('>Select All</label>', '>Seleccionar todos</label>')
    tree = tree.replace('<html lang="en">', '<html lang="es">').replace(' — Knowledge Graph</h1>', ' — Mapa de conocimiento</h1>').replace('>Expand All</button>', '>Expandir todo</button>').replace('>Collapse All</button>', '>Contraer todo</button>').replace('>Reset View</button>', '>Restablecer vista</button>').replace('Total Count:', 'Elementos:')
    (OUT / 'graph.html').write_text(graph, encoding='utf-8')
    (OUT / 'MAPA-CEREBRO.html').write_text(tree, encoding='utf-8')
    print('Visores listos para abrir directamente en el navegador, sin servidor ni conexión.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
