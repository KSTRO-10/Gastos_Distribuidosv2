"""
Management command to create the public tenant and demo tenant required by django-tenants.
The PUBLIC_DOMAIN is assigned to the DEMO tenant so business data tables exist.
Safe to run multiple times (idempotent).
"""

from django.core.management.base import BaseCommand
from decouple import config


class Command(BaseCommand):
    help = 'Creates the public and demo tenants with correct domain routing'

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant, Domain

        domain_name = config('PUBLIC_DOMAIN', default='localhost')

        # 1. Create the public tenant (schema_name='public' is required by django-tenants).
        #    It gets a dummy internal domain — no external traffic goes here.
        public_tenant, created = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={'name': 'Public'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Public tenant created'))
        else:
            self.stdout.write('Public tenant already exists')

        Domain.objects.get_or_create(
            domain='public.internal',
            defaults={'tenant': public_tenant, 'is_primary': True}
        )

        # 2. Create the demo tenant — all business tables (areas, orders, etc.) live here.
        #    The actual server domain points here so API requests reach business data.
        demo_tenant, created = Tenant.objects.get_or_create(
            schema_name='demo',
            defaults={'name': 'Demo'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Demo tenant created (schema: demo)'))
        else:
            self.stdout.write('Demo tenant already exists')

        domain, created = Domain.objects.get_or_create(
            domain=domain_name,
            defaults={'tenant': demo_tenant, 'is_primary': True}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Domain "{domain_name}" → demo tenant'))
        else:
            # If domain exists but points to public tenant, reassign it
            if domain.tenant.schema_name == 'public':
                domain.tenant = demo_tenant
                domain.save()
                self.stdout.write(self.style.SUCCESS(f'Domain "{domain_name}" reassigned → demo tenant'))
            else:
                self.stdout.write(f'Domain "{domain_name}" already exists')
