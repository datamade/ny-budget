import csv
import xlrd
import pandas as pd

def cleanup():
    # no longer need to convert from excel
    # csv_from_excel('SpendingData.xlsx', 'SpendingData.csv')
    f = open('budget_raw.csv', 'rU')
    reader = csv.DictReader(f)
    all_rows = []
    for row in reader:
        for k,v in row.items():
            if 'Actuals' in k or 'Estimates' in k:
                v = v.replace('$', '').replace(',','')
                try:
                    v = float(v)
                except:
                    v = 0
                v = v*1000
            row[k] = v
        all_rows.append(row)
    outp = open('budget_cleaned.csv', 'wb')
    writer = csv.DictWriter(outp, row.keys(), quoting=csv.QUOTE_ALL)
    writer.writeheader()
    writer.writerows(all_rows)
    f.close()
    outp.close()

def add_descriptions():
    breakdowns = ['Fund']

    budget_data = pd.read_csv('budget_cleaned.csv')
    descriptions = pd.read_csv('descriptions_raw.csv')

    for breakdown in breakdowns:
        bd_desc = descriptions[[breakdown, breakdown+' Description']]
        budget_data = budget_data.merge(bd_desc, on=breakdown)

    budget_data.to_csv('budget_finished.csv', index=False)

def csv_from_excel(infile_excel, outfile_csv):

    wb = xlrd.open_workbook(infile_excel)
    sh = wb.sheet_by_name('Sheet1')
    csv_file = open(outfile_csv, 'wb')
    wr = csv.writer(csv_file, quoting=csv.QUOTE_ALL)

    for rownum in xrange(sh.nrows):
        wr.writerow(sh.row_values(rownum))

    csv_file.close()

if __name__ == "__main__":
    cleanup()
    add_descriptions()
