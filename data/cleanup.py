import csv
import xlrd

def cleanup():
    csv_from_excel('SpendingData.xlsx', 'SpendingData.csv')
    f = open('SpendingData.csv', 'rb')
    reader = csv.DictReader(f)
    all_rows = []
    for row in reader:
        for k,v in row.items():
            if 'Expenditure' in k or 'Appropriation' in k:
                v = v.replace('$', '').replace(',','')
                try:
                    float(v)
                except:
                    v = 0
            row[k] = v
        all_rows.append(row)
    outp = open('budget_cleaned.csv', 'wb')
    writer = csv.DictWriter(outp, row.keys())
    writer.writeheader()
    writer.writerows(all_rows)
    f.close()
    outp.close()

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
