# Tipografía empaquetada

Inter y Source Serif 4 se distribuyen con la app para que la interfaz se
muestre sin descargas externas de fuentes. Son las fuentes estáticas usadas
por `google_fonts` 8.2.1; se conservan las familias existentes.

`tool/descargar_fuentes.py` documenta sus URL, tamaño y SHA-256. Solo hace falta
ejecutarlo al reconstruir estos assets, no al iniciar la app ni al compilar
una copia del repositorio que ya contiene los archivos.

Licencias: `OFL-Inter.txt` y `OFL-SourceSerif4.txt`, procedentes del repositorio
oficial de Google Fonts y registradas en el catálogo de licencias de Flutter.
