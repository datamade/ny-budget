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
	getTotalArray: function(name, queryType, isActual, callback) {
		var typeStr = "Nominal";
		if (isActual == true) 
			typeStr = "Actual";

		var myQuery = "SELECT ";
		var year = BudgetLib.startYear;
		while (year <= BudgetLib.endYear)
		{
			myQuery += "SUM('" + typeStr + " " + year + "') AS '" + year + "', ";
			year++;
		}
		myQuery = myQuery.slice(0,myQuery.length-2);  
		myQuery += " FROM " + BudgetLib.BUDGET_TABLE_ID;
		if (name != '')
			myQuery += " WHERE '" + queryType + "' = '" + name + "'";
		
		BudgetHelpers.query(myQuery, callback);
	},
	
	//returns total given year
	getTotalsForYear: function(name, queryType, year, callback) {
		var whereClause = "";
		if (name != "")
			whereClause = " WHERE '" + queryType + "' = '" + name + "'";
		
		var percentageQuery = "";	
		if (year > BudgetLib.startYear) {
			percentageQuery = ", SUM('Nominal " + year + "') AS 'Nominal Top', SUM('Actual " + year + "') AS 'Actual Top', SUM('Nominal " + (year - 1) + "') AS 'Nominal Bottom', SUM('Actual " + (year - 1) + "') AS 'Actual Bottom'";
		}
			
		var myQuery = "SELECT SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual' " + percentageQuery + " FROM " + BudgetLib.BUDGET_TABLE_ID + whereClause;			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//returns all funds nominal/actual totals for given year
	getAllFundsForYear: function(year, callback) {		
		var myQuery = "SELECT 'Minor Function', SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual', 'Minor Function' AS '" + year + "' FROM " + BudgetLib.BUDGET_TABLE_ID + " GROUP BY 'Minor Function'";			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//returns all funds nominal/actual totals for given year
	getAgencies: function(name, queryType, year, callback) {		
		var myQuery = "SELECT 'Agency', SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual', 'Agency' AS '" + year + "', 'Agency ID' FROM " + BudgetLib.BUDGET_TABLE_ID + " WHERE '" + queryType + "' = '" + name + "' GROUP BY 'Agency ID', 'Agency'";			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//returns all control officers nominal/actual totals for given year
	getAllControlOfficersForYear: function (year, callback) {		
		var myQuery = "SELECT 'Control Officer', SUM('Nominal " + year + "') AS 'Nominal', SUM('Actual " + year + "') AS 'Actual', 'Control Officer' AS '" + year + "' FROM " + BudgetLib.BUDGET_TABLE_ID + " GROUP BY 'Control Officer'";			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//gets a fund description based on a fund name
	getFundDescription: function(fund, callback) {
		var myQuery = "SELECT 'Fund Description' FROM " + BudgetLib.FUND_DESCRIPTION_TABLE_ID + " WHERE Item = '" + fund + "'";			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//get a control officer description based on the officer name
	getControlOfficerDescription: function(officer, callback) {
		var myQuery = "SELECT 'Control Officer Description' FROM " + BudgetLib.OFFICER_DESCRIPTION_TABLE_ID + " WHERE Item = '" + officer + "'";			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//get a Agency description from a Agency ID
	getAgencyDescription: function(AgencyId, callback) {
		var myQuery = "SELECT 'Agency ID', Agency, 'Link to Website', 'Agency Description', 'Control Officer', Fund FROM " + BudgetLib.BUDGET_TABLE_ID + " WHERE 'Agency ID' = " + AgencyId;			
		BudgetHelpers.query(myQuery, callback);
	},
	
	//get percentage change per year for display below the sparkline in expanded row detail
	getSparklinePercentages: function(name, queryType, year, callback) {	
		if (year > BudgetLib.startYear) {
			var whereClause = "";
			if (queryType != "")
				whereClause += " WHERE '" + queryType + "' = '" + name + "'";
				
			var myQuery = "SELECT SUM('Nominal " + year + "') AS 'Nominal Top', SUM('Actual " + year + "') AS 'Actual Top', SUM('Nominal " + (year - 1) + "') AS 'Nominal Bottom', SUM('Actual " + (year - 1) + "') AS 'Actual Bottom' FROM " + BudgetLib.BUDGET_TABLE_ID + whereClause;			
			BudgetHelpers.query(myQuery, callback);
		}
	}
}