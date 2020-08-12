import csv
import xlrd
import pandas as pd

def cleanup():
    # no longer need to convert from excel
    # csv_from_excel('SpendingData.xlsx', 'SpendingData.csv')
    f = open('budget_raw.csv', 'r')
    reader = csv.DictReader(f)
    all_rows = []
    for row in reader:
        for k,v in row.items():
            if 'Actuals' in k or 'Estimates' in k:
                v = v.replace('$', '').replace(',','')

                if len(v)>1:
                    if v[0]=='(' and v[-1]==')':
                        v = '-'+v[1:-1]

                try:
                    v = float(v)
                except:
                    v = 0
                v = v*1000
            row[k] = v
        all_rows.append(row)
    outp = open('budget_cleaned.csv', 'w')
    writer = csv.DictWriter(outp, row.keys(), quoting=csv.QUOTE_ALL)
    writer.writeheader()
    writer.writerows(all_rows)
    f.close()
    outp.close()

def add_descriptions():

    budget_data = pd.read_csv('budget_cleaned.csv')

    breakdown_types = ['Agency', 'Fund', 'FP Category', 'Fund Type']
    desc_all = pd.read_csv('descriptions.csv')

    for breakdown_type in breakdown_types:
        desc_chunk = desc_all[ desc_all['Breakdown Type']==breakdown_type ]
        desc_chunk = desc_chunk[['Name', 'Description']]

        # strip trailing whitespace
        desc_chunk['Name'] = desc_chunk['Name'].map(lambda name: name.strip())
        desc_chunk.rename(columns={'Name': breakdown_type}, inplace=True)

        budget_data = budget_data.merge(desc_chunk, how='left', on=breakdown_type)
        budget_data.rename(columns={'Description': breakdown_type+' Description'}, inplace=True)

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
