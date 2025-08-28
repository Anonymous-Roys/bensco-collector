# Bensco Susu Limited - Backend

This is the backend system powering the Bensco Susu App, a native Android and web-based platform for managing daily savings, contributions, and payouts.

---

## Stack

- **Framework**: Django + Django REST Framework
- **Database**: PostgreSQL
- **Auth**: JWT (role-based: Admin & Collector)
- **Frontend**: Native Android (Collectors) + React Admin Dashboard (Owner)

---



## Folder Structure

```bash
bensco_susu_backend/
├── users/
├── clients/
├── contributions/
├── payouts/
├── savings/
├── core/
├── settings/


```

## Inorder to run the container (the django backend together witht eh postgres database)

- cd into the directory containing the Dockerfile and Docker compose file
- type ``docker-compose up --build``
- open a second terminal,cd into the dir containing the docker file and hit ``docker exec -it django-container /bin/bash``
- Enter ``python manage.py makemigrations``
- Enter ``python manage.py migrate``
- Visit ``http://localhost:8000/``


Your backend dev server should be working successfully
python manage.py createsuperuser

python manage.py shell

from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.get(username="bensco")
user.role = "admin"   # update role
user.save()
