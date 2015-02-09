ny-budget
=========

Budget visualization for New York. Based on Look at Cook

SCREENSHOT HERE

This is based on [Look at Cook](http://lookatcook.com) by Derek Eder and Nick Rougeux at [Open City](http://opencityapps.org), and can be easily re-deployed to visualize other budgets.

#### Dependencies

- [jQuery](http://jquery.com)
- [D3](http://d3js.org) (for CSV manipulation)
- [Backbone](http://backbonejs.org/) (javascript MVC framework)
- [Highcharts](http://www.highcharts.com/) (charting library)
- [Datatables](http://datatables.net) (sortable HTML tables)

## How to Re-Deploy
This code can be customized to visualize another data set.
####Data Prepatation
The budget data can be in various forms (csv, google doc, google fusion table), but must adhere to a fixed format in order for the app to process it properly. Budget column headers include: Fund ID, Fund, Department ID, Department, Short Title, Link to Website, Department Description, and Control Officer. Values for estimates and actuals must be broken down into a separate column for each year.

See examples of prepped data:
  - [New Orleans](https://docs.google.com/spreadsheet/ccc?key=0AswuyKhD7LxVdGlERGdEckpaRDc4Q1RCN0tjZ2tMMGc&usp=sharing_eil#gid=0)
  - [Cook County](https://www.google.com/fusiontables/DataSource?dsrcid=1227404)
  - [Macoupin County](https://github.com/datamade/macoupin-budget/blob/master/data/macoupin-budget_1997-2014.csv)
  - [A blank template to populate](https://docs.google.com/spreadsheets/d/1I6xZe8syHTiLguZ56l6J1KW0nAJVrUilvq0eP-BpE2A/edit?usp=sharing)

####Configuration
1. Once the data is prepared, set dataSource in js/app.js to link up to your data.
  
  *If your budget data is in CSV form:*
  Drop the csv file in the data folder, and set dataSource to the file path.
  
  *If your data is in a google doc:*
  You will first need to publish the google doc to the web as a CSV. Then, set dataSource to the URL provided.
  
  ![alt-tag](https://cloud.githubusercontent.com/assets/1406537/3767681/94b15ba4-18cf-11e4-96b1-a2dca1f39c73.png) 
  ![alt-tag](https://cloud.githubusercontent.com/assets/1406537/3767658/55df1880-18cf-11e4-9593-51bc89b0744a.png)
  
2. Next, set the following configuration variables at the top of js/app.js:
  - startYear
  - endYear
  - activeYear
  - municipalityName

## Errors / bugs

If something is not behaving intuitively, it is a bug, and should be [reported as an issue](https://github.com/datamade/ny-budget/issues)

You can also email info@datamade.us or tweet @DataMadeCo.

## Note on patches/pull requests

* Fork the project.
* Make your feature addition or bug fix.
* Commit and send me a pull request. Bonus points for topic branches.
