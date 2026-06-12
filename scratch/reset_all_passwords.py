import os
import sys
import django

# Add backend to path and set settings
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
users = User.objects.all()

for user in users:
    if user.email == 'admin@gastos.local':
        user.set_password('admin123')
    else:
        user.set_password('test123')
    user.save()

print(f"✅ Reset passwords for {users.count()} users.")
