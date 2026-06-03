import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('gastos_distribuidos')

app.conf.broker_url = 'memory://'
app.conf.result_backend = 'cache+memory://'

app.config_from_object('django.conf:settings', namespace='CELERY')

app.conf.broker_url = 'memory://'
app.conf.result_backend = 'cache+memory://'
app.conf.task_always_eager = True
app.conf.task_eager_propagates = True

app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')