import csv

FUNDS = {
    'General Fund': 1,
    'Health Fund': 4,
    'Highway Fund': 3,
    'Special Purpose Fund': 2,
}

def add_fund_id(reader):
    for row in reader:
        fund_id = FUNDS[row[0].strip()]
        row.insert(1, fund_id)
        yield row

if __name__ == '__main__':
    outp = open('macoupin-budget-2014-cleaned.csv', 'wb')
    writer = csv.writer(outp)
    with open('macoupin-budget-2014.csv', 'rb') as f:
        reader = csv.reader(f)
        headers = reader.next()
        headers.insert(1, 'Fund ID')
        writer.writerow(headers)
        writer.writerows(add_fund_id(reader))
    outp.close()
