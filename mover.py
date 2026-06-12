import json
import uuid
import psycopg2

from word_type import WordType, TYPE_COLOR_MAP

word_type = WordType.noun
color = TYPE_COLOR_MAP[word_type]

conn = psycopg2.connect(
    dbname="Languages",
    user="postgres",
    password="963013",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

with open("./dictionary-en-es.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for category, words in data.items():
    for lemma, translation in words.items():

        if lemma[0] !=" " and lemma[1] != " " and lemma[2] !=" ":
            number = "plural"
        else:
            number = 'singular'

        cur.execute("""
            INSERT INTO dictionary (
                unique_id,
                lemma,
                translation,
                type,
                color,
                number,
                example
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()),
            lemma.strip(),
            json.dumps({
                "es": translation.strip()
            }),
            word_type.value, 
            color,      
            number,
            "This is an example sentence."    
        ))

conn.commit()
cur.close()
conn.close()