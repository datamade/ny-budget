# Big Easy Budget Visualization

A budget transparency visualization for New Orleans, displaying appropriations & spending broken down by funds/departments from 2004 to 2014.

![alt-tag](https://cloud.githubusercontent.com/assets/1406537/3756294/d90203ce-182c-11e4-8832-918dbbcafb94.png)

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
The budget data can be in various forms (csv, google doc, google fusion table), but must adhere to a fixed format in order for the app to process it properly. Budget column headers include: Fund ID, Fund, Department ID, Department, Short Title, Link to Website, Department Description, and Control Officer. Values for appropriations and expenditures must be broken down into a separate column for each year.
See an example [here](https://docs.google.com/spreadsheet/ccc?key=0AswuyKhD7LxVdGlERGdEckpaRDc4Q1RCN0tjZ2tMMGc&usp=sharing_eil#gid=0) and a blank template to populate [here](https://docs.google.com/spreadsheets/d/1I6xZe8syHTiLguZ56l6J1KW0nAJVrUilvq0eP-BpE2A/edit?usp=sharing)

####Configuration
Once the data is prepared, set dataSource in js/app.js to link up to your data.
Next, set the following configuration variables at the top of js/app.js:
- startYear
- endYear
- activeYear
- municipalityName

## Errors / bugs

If something is not behaving intuitively, it is a bug, and should be [reported as an issue](https://github.com/datamade/bigeasy-budget/issues)

You can also email info@datamade.us or tweet @DataMadeCo.

## Note on patches/pull requests

* Fork the project.
* Make your feature addition or bug fix.
* Commit and send me a pull request. Bonus points for topic branches.
