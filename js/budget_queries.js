/*!
 * Look at Cook Budget Queryies library
 * http://lookatcook.com/
 *
 * Copyright 2012, Derek Eder and Nick Rougeux
 * Licensed under the MIT license.
 * https://github.com/open-city/look-at-cook/wiki/License
 *
 * Date: 3/24/2012
 *
 * Fusion Table queries called by BudgetLib
 *
 */

var BudgetQueries = BudgetQueries || {};
var BudgetQueries = {

  //gets fund or Agency totals per year for highcharts
	getTotalArray: function(name, queryType, typeStr) {
	// var typeStr = "Nominal";
	// if (isActual == true)
	// 	typeStr = "Actual";

	// var myQuery = "SELECT ";
	// var year = BudgetLib.startYear;
        var expenditures = [];
        var appropriations = [];
	//  while (year <= BudgetLib.endYear)
	//  {
    //      expenditures.push.apply(expenditures, budget.toJSON())
	//  	myQuery += "SUM('" + typeStr + " " + year + "') AS '" + year + "', ";
	//  	year++;
	//  }
	// myQuery = myQuery.slice(0,myQuery.length-2);
	// myQuery += " FROM " + BudgetLib.BUDGET_TABLE_ID;
	// if (name != '')
	// 	myQuery += " WHERE '" + queryType + "' = '" + name + "'";

	// BudgetHelpers.query(myQuery, callback);
	},

	//returns total given year
	getTotalsForYear: function(name, queryType, yearCurrent, yearCompare, callback) {
		var whereClause = "";
		if (name != "")
			whereClause = " WHERE '" + queryType + "' = '" + name + "'";

		var select = "SUM('Nominal " + yearCurrent + "') AS 'Nominal Current', SUM('Actual " + yearCurrent + "') AS 'Actual Current', SUM('Nominal " + yearCompare + "') AS 'Nominal Compare', SUM('Actual " + yearCompare + "') AS 'Actual Compare'";
		var query = "SELECT " + select + " FROM " + BudgetLib.BUDGET_TABLE_ID + whereClause;
		BudgetHelpers.query(query, callback);
	},

	//returns all funds nominal/actual totals for given year
	getAllFundsForYear: function(year, callback) {
		var myQuery = "SELECT 'Minor Function', SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual', 'Minor Function' AS '" + year + "' FROM " + BudgetLib.BUDGET_TABLE_ID + " GROUP BY 'Minor Function'";
		BudgetHelpers.query(myQuery, callback);
	},

	getAgenciesForQuery: function(query, year, callback) {
		var myQuery = "SELECT 'Agency', SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual', 'Agency' AS '" + year + "', 'Agency ID' FROM " + BudgetLib.BUDGET_TABLE_ID + " WHERE 'Agency' CONTAINS IGNORING CASE '" + query + "' GROUP BY 'Agency ID', 'Agency'";
		BudgetHelpers.query(myQuery, callback);
	},

	//returns all funds nominal/actual totals for given year
	getAgencies: function(name, queryType, year, callback) {
		var myQuery = "SELECT 'Agency', SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual', 'Agency' AS '" + year + "', 'Agency ID' FROM " + BudgetLib.BUDGET_TABLE_ID + " WHERE '" + queryType + "' = '" + name + "' GROUP BY 'Agency ID', 'Agency'";
		BudgetHelpers.query(myQuery, callback);
	},

	//gets a fund description based on a fund name
	getFundDescription: function(fund, callback) {
		var myQuery = "SELECT 'Description' FROM " + BudgetLib.FUND_DESCRIPTION_TABLE_ID + " WHERE 'Name' = '" + fund + "'";
		BudgetHelpers.query(myQuery, callback);
	},

	//get a Agency description from a Agency ID
	getAgencyDescription: function(AgencyId, callback) {
		var myQuery = "SELECT 'Agency ID', Agency, 'Description', 'Website', 'Major Function', 'Minor Function' FROM " + BudgetLib.BUDGET_TABLE_ID + " WHERE 'Agency ID' = '" + AgencyId + "'";
		BudgetHelpers.query(myQuery, callback);
	},

	//get percentage change per year for display below the sparkline in expanded row detail
	getSparklinePercentages: function(name, queryType, yearCurrent, yearCompare, callback) {
		var whereClause = "";
		if (queryType != "")
			whereClause += " WHERE '" + queryType + "' = '" + name + "'";

		var myQuery = "SELECT SUM('Nominal " + yearCurrent + "') AS 'Nominal Top', SUM('Actual " + yearCurrent + "') AS 'Actual Top', SUM('Nominal " + yearCompare + "') AS 'Nominal Bottom', SUM('Actual " + yearCompare + "') AS 'Actual Bottom' FROM " + BudgetLib.BUDGET_TABLE_ID + whereClause;
		BudgetHelpers.query(myQuery, callback);
	}
}
