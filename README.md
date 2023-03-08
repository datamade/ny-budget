ny-budget
=========

An explorable budget visualization for the state of New York

![screen shot 2015-05-07 at 3 22 46 pm](https://cloud.githubusercontent.com/assets/1406537/7525268/948cd3a8-f4cd-11e4-9485-2ca92af248ac.png)

This is based on [Look at Cook](http://lookatcook.com) by Derek Eder and Nick Rougeux at [Open City](http://opencityapps.org), and can be easily re-deployed to visualize other budgets.

#### Dependencies

- [jQuery](http://jquery.com)
- [D3](http://d3js.org) (for CSV manipulation)
- [Backbone](http://backbonejs.org/) (javascript MVC framework)
- [Highcharts](http://www.highcharts.com/) (charting library)
- [Datatables](http://datatables.net) (sortable HTML tables)

## How to update this New York visualization

#### 1. Update Data
The csv inputs that may need to be updated going forward are:

- the budget numbers (```data/budget_raw.csv```)
- the budget descriptions (```data/descriptions.csv```)

A `csv` and `xlsx` file are typically shared with the same data. I've found that the `csv` file sometimes has formatting issues, so I export the `xlsx` file as a new `budget_raw.csv`

`cleanup.py` is a python script that requires pandas and xlrd. You can install them by running:

```
pip install -r requirements.txt
```

When updating either of the above csvs, run the ```cleanup.py``` script to generate the finished budget, ```budget_finished.csv```:

```
python cleanup.py
```

#### 2. Update settings
The settings in ```js/settings.js``` that may need to be updated going forward are:
- ```endYear``` (for example, if the last year in the budget is '2023-24', set the end year to 2024)
- ```activeYear``` (typically set to the same as `endYear`)
- ```projectionStartYear``` (for example, if the first year of estimates is '2023-24', set this to 2023)
- ```plotBandBuffer``` (this determines the # months of padding for the beginning of the estimates plot band. if there are multiple years of estimates, set a small buffer like -1, otherwise set it to a larger negative number, e.g. -7, for more space)
- ```inflation_idx``` (array of years and CPI values. typically we update the most recent years to track accurate inflation)
- ```benchmark``` (set to the current year)

#### 3. Preview
To preview changes locally:

```
python -m SimpleHTTPServer
```

#### 4. Share preview with client
Open a pull requst with the latest changes. This will create a deploy preview in netlify that you can share with the client for review.

#### 4. Deploy
The site is hosted on Netlify, so deploy previews are available if you make a pull request.

To deploy to production, push the changes into the ```deploy``` branch:

```bash
git push origin main
git push origin main:deploy
```

Live changes will be seen at https://ny-budget.datamade.us

## How to adapt this to another budget
This code can be customized to visualize another data set.

####Data Prepatation
The budget data must be a csv that adheres to a fixed format in order for the app to process it properly. Budget column headers include: Fund ID, Fund, Department ID, Department, Short Title, Link to Website, Department Description, and Control Officer. Values for estimates and actuals must be broken down into a separate column for each year.

See examples of prepped data:
  - [New Orleans](https://docs.google.com/spreadsheet/ccc?key=0AswuyKhD7LxVdGlERGdEckpaRDc4Q1RCN0tjZ2tMMGc&usp=sharing_eil#gid=0)
  - [Cook County](https://www.google.com/fusiontables/DataSource?dsrcid=1227404)
  - [Macoupin County](https://github.com/datamade/macoupin-budget/blob/master/data/macoupin-budget_1997-2014.csv)
  - [A blank template to populate](https://docs.google.com/spreadsheets/d/1I6xZe8syHTiLguZ56l6J1KW0nAJVrUilvq0eP-BpE2A/edit?usp=sharing)

If you need to do any preparation on your raw data to get it into the finished format (e.g. formatting dollar amounts, removing whitespace, adding descriptions), do it in a script so that it will be repeatable in the future. See an example script in ```data/cleanup.py```.

####Configuration
1. Put your finished budget csv file in the ```data/``` folder
  
2. Next, set the configuration variables in ```js/settings.js```

## Team

* Cathy Deng, DataMade
* Derek Eder, DataMade

## Errors / bugs

If something is not behaving intuitively, it is a bug, and should be [reported as an issue](https://github.com/datamade/ny-budget/issues)

You can also email info@datamade.us or tweet @DataMadeCo.

## Note on patches/pull requests

* Fork the project.
* Make your feature addition or bug fix.
* Commit and send me a pull request. Bonus points for topic branches.

## Copyright and Attribution

Copyright (c) 2016 DataMade. Released under the [MIT License](https://github.com/datamade/ny-budget/blob/master/LICENSE).
