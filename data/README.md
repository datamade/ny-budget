# Updating the NY Budget

About once a quarter, we receive requests to update the data for the NY State budget visualization. We typically are given between a few days to a week advance notice that the request is coming. When it comes, there is a time sensitivity and required coordination to publish the updates at a specific time. This typically comes in the form of an email, but is not scheduled with a specific time in advance.

## Steps to update

1. We receive a set of `xlsx` and `csv` files with the latest budget numbers and CPI values. For example:
 - `032720CPI.xlsx.xlsx`
 - `Spending_Data_21_EnactedBudget.csv`
 - `Spending_Data_21_EnactedBudget.xlsx`
2. The spending data csv and xlsx files are identical, however due to formatting issues that have caused issues in the past, I take the `xlsx` file and save it as a `csv` file in Excel or LibreOffice.
3. Take the saved Spending_Data csv and move it into the `data/` directory and overwrite the `budget_raw.csv` file.
4. Run the cleanup python script, which formats the data and folds in the descriptions for each fund, category and department. Note, this is a python2 project, and so your virtualenv will need to use this older version of python. 
 - working on it the first time: `mkvirtualenv nybudget --python=/usr/local/bin/python`
 - working on it again: `workon nybudget`
 - then run: `python cleanup.py`
5. Referencing the CPI xlsx file, manually update the `js/settings.js` file `inflation_idx` for current and future years if they have changed. The CPI is the consumer price index, and is updated periodically. We use this to adjust the budget for inflation in the visualization. Example: https://github.com/datamade/ny-budget/commit/67f48a27335b078892f1b394b2261436befeee8d
6. If the budget includes a new year of data, the year settings will need to be updated in 1js/settings.js: `endYear`, `activeYear`, `projectionStartYear`, `benchmark`
Example: https://github.com/datamade/ny-budget/commit/739d2e552fa01350489819fc75bb0ebe76a80424
7. Run the application locally. It is a static HTML site, so you can use a number of local servers to do so.
 - python 2: `python -m SimpleHTTPServer`
 - python 3: `python -m http.server`
8. If all looks good, create a pull request and merge the changes into master.
9. When the folks in NY give the green light, deploy the site by pushing the `master` branch into `deploy`
```
git push origin master:deploy
```
