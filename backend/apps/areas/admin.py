from django.contrib import admin
from .models import Area, PersonalArea


class PersonalAreaInline(admin.TabularInline):
    model = PersonalArea
    extra = 1
    autocomplete_fields = ['user']


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'manager', 'presupuesto_anual', 'is_active']
    list_filter = ['is_active', 'company', 'created_at']
    search_fields = ['name', 'code', 'company__razon_social']
    autocomplete_fields = ['company', 'manager', 'parent']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    inlines = [PersonalAreaInline]


@admin.register(PersonalArea)
class PersonalAreaAdmin(admin.ModelAdmin):
    list_display = ['user', 'area', 'cargo', 'is_primary', 'created_at']
    list_filter = ['is_primary', 'area__company', 'created_at']
    search_fields = ['user__full_name', 'user__email', 'area__name']
    autocomplete_fields = ['user', 'area']
