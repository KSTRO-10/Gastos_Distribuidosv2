import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
import django
django.setup()

from apps.invoices.services.cfdi_parser import parse_cfdi_xml

def test_file(file_path):
    print(f"\n--- Testing {file_path} ---")
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        data = parse_cfdi_xml(content)
        print(f"Emisor: {data.get('emisor')}")
        print(f"Receptor: {data.get('receptor')}")
        print(f"Conceptos: {len(data.get('conceptos', []))}")
        print(f"UUID: {data.get('timbre', {}).get('uuid', '')}")
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

if __name__ == '__main__':
    test_file('backend/archivos_prueba/cfdi_v33_prueba.xml')
    test_file('backend/archivos_prueba/cfdi_v40_prueba.xml')
