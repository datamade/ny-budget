ny-budget
=========

Budget visualization for New York. Based on Look at Cook

![screen shot 2015-05-07 at 3 22 46 pm](https://cloud.githubusercontent.com/assets/1406537/7525268/948cd3a8-f4cd-11e4-9485-2ca92af248ac.png)

This is based on [Look at Cook](http://lookatcook.com) by Derek Eder and Nick Rougeux at [Open City](http://opencityapps.org), and can be easily re-deployed to visualize other budgets.

## How to update this visualization

The inputs that may need to be updated going forward are:

1. the budget numbers (```data/budget_raw.csv```)
2. the budget descriptions (```data/descriptions.csv```)
3. the inflation indices (defined by ```inflation_idx``` in ```js/settings.js```)
 
When updating either ```budget_raw.csv``` or ```descriptions.csv```, run the ```cleanup.py``` script to generate the finished budget, ```budget_finished.csv```:

```
> python cleanup.py
```

To deploy, push the changes into the ```gh-pages``` branch:
```
> git push origin master
> git push origin master:gh-pages
```

#### Dependencies

- [jQuery](http://jquery.com)
- [D3](http://d3js.org) (for CSV manipulation)
- [Backbone](http://backbonejs.org/) (javascript MVC framework)
- [Highcharts](http://www.highcharts.com/) (charting library)
- [Datatables](http://datatables.net) (sortable HTML tables)

## How to adapt this to another budget
This code can be customized to visualize another data set.

####Data Prepatation
The budget data must be a csv that adheres to a fixed format in order for the app to process it properly. Budget column headers include: Fund ID, Fund, Department ID, Department, Short Title, Link to Website, Department Description, and Control Officer. Values for estimates and actuals must be broken down into a separate column for each year.

See examples of prepped data:
  - [New Orleans](https://docs.google.com/spreadsheet/ccc?key=0AswuyKhD7LxVdGlERGdEckpaRDc4Q1RCN0tjZ2tMMGc&usp=sharing_eil#gid=0)
  - [Cook County](https://www.google.com/fusiontables/DataSource?dsrcid=1227404)
  - [Macoupin County](https://github.com/datamade/macoupin-budget/blob/master/data/macoupin-budget_1997-2014.csv)
  - [A blank template to populate](https://docs.google.com/spreadsheets/d/1I6xZe8syHTiLguZ56l6J1KW0nAJVrUilvq0eP-BpE2A/edit?usp=sharing)

####Configuration
1. Once the data is prepared, set dataSource in js/app.js to link up to your data.
  
  Drop your csv file in the data folder, and set dataSource to the file path. If you need to do any preparation on your raw data (e.g. formatting dollar amounts, removing whitespace), do it in a script so that it will be repeatable in the future. See an example script in ```data/cleanup.py```.
  
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
