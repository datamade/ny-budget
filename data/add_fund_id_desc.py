import csv
from csvkit.sql import make_table, make_create_table_statement
from csvkit.unicsv import UnicodeCSVWriter, UnicodeCSVReader
from csvkit.table import Table
import sqlite3
import codecs

FUNDS = {
    'General Fund': 1,
    'Health Fund': 4,
    'Highway Fund': 3,
    'Special Purpose Fund': 2,
}

def add_attrs(reader, curs):
    for row in reader:
        fund_id = FUNDS[row[0].strip()]
        row.insert(1, fund_id)
        print(row[0], row[4])
        curs.execute('select Department_Description, URL from description where Fund = ? and Department = ?', (row[0], row[4]))
        res = curs.fetchone()
        if res and res[0] != 'None':
            row[7] = res[0]
            row[6] = res[1]
        yield row

def make_db(fname, tblname):
    conn = sqlite3.connect(':memory:')
    t = Table.from_csv(open(fname, 'rb'), name=tblname)
    sql_table = make_table(t)
    create_st = make_create_table_statement(sql_table)
    print create_st
    insert = sql_table.insert()
    curs = conn.cursor()
    curs.execute(create_st)
    headers = t.headers()
    print headers
    rows = [dict(zip(headers, row)) for row in t.to_rows()]
    for row in rows:
        curs.execute(str(insert), row)
    return curs

if __name__ == '__main__':
    curs = make_db('macoupin-descriptions.csv', 'description')
    outp = open('macoupin-budget-2014-cleaned.csv', 'wb')
    writer = UnicodeCSVWriter(outp)
    with open('macoupin-budget-2014.csv', 'rb') as f:
        reader = UnicodeCSVReader(f)
        headers = reader.next()
        headers.insert(1, 'Fund ID')
        writer.writerow(headers)
        writer.writerows(add_attrs(reader, curs))
