var app = {};

startYear   = 1995;  // first year of budget data
endYear     = 2016;  // last year of budget data
activeYear  = 2016;  // default year to select
debugMode   = false; // change to true for debugging message in the javascript console
municipalityName = 'State of New York'; // name of budget municipality 
apropTitle  = 'Estimates'; // label for first chart line
expendTitle = 'Actuals';   // label for second chart line

// Inflation Index (for inflation adjusted dollars)
benchmark = 2015;
inflation_idx = {
    1995: 149.3, 1996: 153.4, 1997: 158.0, 1998: 161.1, 1999: 163.7,
    2000: 167.9, 2001: 173.6, 2002: 177.6, 2003: 181.2, 2004: 184.8,
    2005: 190.3, 2006: 197.0, 2007: 202.8, 2008: 209.5, 2009: 215.2,
    2010: 215.8, 2011: 219.2, 2012: 226.5, 2013: 230.6, 2014: 233.8,
    2015: 237.3
}

// CSV data source for budget data
dataSource  = window.location.origin + '/data/budget_cleaned.csv';

app.GlobalChartOpts = {
    apropColor:   '#6e6e6e',
    apropSymbol:  'circle',
    
    expendColor:  '#23387E',
    expendSybmol: 'square',

    apropTitle:   apropTitle, 
    expendTitle:  expendTitle, 
    pointInterval: 365 * 24 * 3600 * 1000 // chart interval set to one year (in ms)
}