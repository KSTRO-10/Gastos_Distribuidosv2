import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.test import Client
from apps.accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken


def debug_endpoints():
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("No superuser found.")
        return

    # Generate JWT token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = Client()

    endpoints = [
        ("/api/inventory/stock/", "Stock"),
        ("/api/procurement/solicitudes/", "Solicitudes"),
        ("/api/orders/ordenes/", "Ordenes"),
        ("/api/companies/proveedores/", "Proveedores"),
    ]

    for url, name in endpoints:
        print(f"\n--- Testing {name} ({url}) ---")
        try:
            # Pass token in HTTP_AUTHORIZATION header
            response = client.get(url, HTTP_AUTHORIZATION=f"Bearer {access_token}")
            print(f"Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"Error Content: {response.content.decode('utf-8')[:500]}")
            else:
                data = json.loads(response.content.decode("utf-8"))
                if isinstance(data, dict) and "results" in data:
                    print(f"Success! Found {len(data['results'])} items.")
                elif isinstance(data, list):
                    print(f"Success! Found {len(data)} items.")
                else:
                    print(f"Success! Returned object with keys: {list(data.keys())}")
        except Exception as e:
            print(f"Exception occurred: {e}")


if __name__ == "__main__":
    debug_endpoints()
