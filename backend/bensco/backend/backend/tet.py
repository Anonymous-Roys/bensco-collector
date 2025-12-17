import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM clients_clientmodel;")
print(cursor.fetchone())
cursor.close()
conn.close()
