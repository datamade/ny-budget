var app = {};

startYear   = 1995;  // first year of budget data
endYear     = 2019;  // last year of budget data
activeYear  = 2019;  // default year to select
debugMode   = false; // change to true for debugging message in the javascript console
municipalityName = 'State of New York'; // name of budget municipality 

// these are passed into getColumnName to read data from the source
estTitle  = 'Estimates';    // title for first series
actualTitle = 'Actuals';    // title for second series

mergeSeries = true;         // true if estimates & actuals span different years & can be merged into one line, otherwise false
projectionStartYear = 2019; // if some numbers are projections into the future, set as year of first projection. otherwise, set null. it is assumed that estEndYear = endYear. this determines the chart x axis band
plotBandBuffer = -7;        // move the plot band start N months back, for styling


// Inflation Index (for inflation adjusted dollars)
benchmark = 2018;
inflation_idx = {
    1995: 149.3, 1996: 153.4, 1997: 158.0, 1998: 161.1, 1999: 163.7,
    2000: 167.9, 2001: 173.6, 2002: 177.6, 2003: 181.2, 2004: 184.8,
    2005: 190.3, 2006: 197.0, 2007: 202.8, 2008: 209.5, 2009: 215.2,
    2010: 215.8, 2011: 219.2, 2012: 226.5, 2013: 230.6, 2014: 233.8,
    2015: 236.7, 2016: 237.6, 2017: 241.5, 2018: 246.5, 2019: 252.7, 
    2020: 258.2, 2021: 264.3, 2022: 270.5, 2023: 276.7, 2024: 283.1, 
    2025: 289.4
}
 
enable_inflation_toggle = true; // by default, show inflation adjusted (real) numbers. toggle to show nominal (unadjusted) numbers

// CSV data source for budget data
dataSource  = window.location.origin + '/data/budget_finished.csv';

app.GlobalChartOpts = {
    estColor:   '#6e6e6e',
    estSymbol:  'circle',
    
    actualColor:  '#23387E',
    actualSymbol: 'square',

    estTitle:   estTitle, 
    actualTitle:  actualTitle, 
    pointInterval: 365 * 24 * 3600 * 1000, // chart interval set to one year (in ms)

    projectionBandColor: '#e4e4e4'
}