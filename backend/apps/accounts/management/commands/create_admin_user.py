"""
Management command to create an initial admin user.
Safe to run multiple times (idempotent).
"""

from django.core.management.base import BaseCommand
from decouple import config


class Command(BaseCommand):
    help = 'Creates an initial admin user if none exists'

    def handle(self, *args, **options):
        from apps.accounts.models import User, Role

        email = config('ADMIN_EMAIL', default='admin@demo.com')
        password = config('ADMIN_PASSWORD', default='Admin1234!')

        if User.objects.filter(email=email).exists():
            self.stdout.write(f'Admin user "{email}" already exists')
            return

        # Create admin role if it doesn't exist
        role, _ = Role.objects.get_or_create(
            name=Role.RoleType.ADMIN,
            defaults={
                'description': 'Administrador del sistema',
                'permissions': Role.get_default_permissions(Role.RoleType.ADMIN),
            }
        )

        user = User.objects.create_superuser(
            username='admin',
            email=email,
            password=password,
            full_name='Administrador',
            role=role,
        )
        self.stdout.write(self.style.SUCCESS(f'Admin user "{email}" created'))
