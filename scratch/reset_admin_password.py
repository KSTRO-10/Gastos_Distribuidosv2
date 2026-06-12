import os
import sys
import django

# Add backend to path and set settings
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model

try:
    User = get_user_model()
    user = User.objects.get(email='admin@gastos.local')
    user.set_password('admin123')
    user.save()
    print(f"✅ Password reset successful for: {user.email}")
    print(f"✅ Active status: {user.is_active}")
    print(f"✅ Password verification test (admin123): {user.check_password('admin123')}")
except User.DoesNotExist:
    print("❌ User admin@gastos.local not found")
except Exception as e:
    print(f"❌ Error: {e}")
