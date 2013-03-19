/*!
 * Look at Cook Budget Helpers library
 * http://lookatcook.com/
 *
 * Copyright 2012, Derek Eder and Nick Rougeux
 * Licensed under the MIT license.
 * https://github.com/open-city/look-at-cook/wiki/License
 *
 * Date: 3/24/2012
 *
 * Helpers called by BudgetLib
 * 
 */

var BudgetHelpers = BudgetHelpers || {};  
var BudgetHelpers = {

  query: function(sql, callback) {  
    var sql = encodeURIComponent(sql);
    //console.log("https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&key="+BudgetLib.FusionTableApiKey);
    $.ajax({
      url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+BudgetLib.FusionTableApiKey, 
      dataType: "jsonp"
    });
  },

  handleError: function(json) {
    if (json["error"] != undefined)
      console.log("Error in Fusion Table call: " + json["error"]["message"]);
  },
	
  //converts SQL query to URL
  getQuery: function(query) {
    //console.log('http://www.google.com/fusiontables/gvizdata?tq='  + encodeURIComponent(query));
    return query = new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq='  + encodeURIComponent(query));
  },
  	
  //converts a Fusion Table json response in to an array for passing in to highcharts
  getDataAsArray: function(json) {
    var data = json["rows"][0]; 
    var dataArray = [];
    var lastItem = 0;
    for(var i=0; i<data.length; i++) { 
      dataArray[i] = +data[i];
      lastItem = i;
    }

    //For the most recent year, we are sometimes missing data.
    //By setting the last year to null when 0, Highcharts just truncates the line.
    if (dataArray[lastItem] == 0) dataArray[lastItem] = null;
    return dataArray;
  },

  getAddressLink: function(year, type, handle, linkTitle) {
    var href = "/?year=" + year + "&amp;" + type + "=" + handle;
  	return ("<a class='adr' href='" + href + "' rel='address:" + href + "'>" + linkTitle + "</a>");
  },
  
  generateTableRow: function(rowId, detailLoadFunction, rowName, nominal, actual) {
    return "\
      <tr id='" + rowId + "'>\
        <td>\
        <a onclick='" + detailLoadFunction + "'><img class='budget-expand-img' src='images/expand.png' /></a>&nbsp;<a onclick='" + detailLoadFunction + "'>" + rowName + "</a>\
        </td>\
        <td class='num nominal'>" + nominal + "</td>\
        <td class='num actual'>" + actual + "</td>\
      </tr>";
  },
  
  generateExpandedRow: function(itemId, type) {
    var breakdownLink = BudgetHelpers.getAddressLink(BudgetLib.loadYear, type, BudgetHelpers.convertToQueryString(itemId), "Breakdown by agency&nbsp;&raquo;");

    return "\
      <tr class='expanded-content' id='" + itemId + "-expanded'>\
        <td colspan='4'>\
          <div class='expanded-primary'>\
            <h2>" + BudgetHelpers.convertToPlainString(itemId) + "</h2>\
            <p id='expanded-description'></p>\
            <ul class='stats'>\
              <li>" + breakdownLink + "</li>\
            </ul>\
            </div>\
            <div class='expanded-secondary'>\
            <div class='sparkline' id='selected-chart'></div>\
            <ul class='stats'>\
              <li id='sparkline-nominal'></li>\
              <li id='sparkline-actual'></li>\
            </ul>\
          </div>\
        </td>\
      </tr>";
  },
  
  generateExpandedDeptRow: function(departmentId, department, description, linkToWebsite, majorFunction, minorFunction) {
    if (linkToWebsite != '')
      linkToWebsite = "<a href='" + linkToWebsite + "'>Official&nbsp;website&nbsp;&raquo;</a>";
      
    return "\
      <tr class='expanded-content' id='department-" + departmentId + "-expanded'>\
        <td colspan='5'>\
          <div class='expanded-primary'>\
            <h2>" + department + "</h2>\
            <p>" + description + " " + linkToWebsite + "</p>\
            <p>\
              Major Function: " + BudgetHelpers.getAddressLink(BudgetLib.loadYear, 'major', BudgetHelpers.convertToQueryString(majorFunction), majorFunction + " &raquo;") + "</a>\
              <br />\
              Minor Function: " + BudgetHelpers.getAddressLink(BudgetLib.loadYear, 'minor', BudgetHelpers.convertToQueryString(minorFunction), minorFunction + " &raquo;") + "</a>\
            </p>\
          </div>\
          <div class='expanded-secondary'>\
            <div class='sparkline' id='selected-chart'></div>\
            <ul class='stats'>\
              <li id='sparkline-nominal'></li>\
              <li id='sparkline-actual'></li>\
            </ul>\
          </div>\
        </td>\
      </tr>";
  },
  
  //converts a text in to a URL slug
  convertToSlug: function(text) {
    if (text == undefined) return '';
  	return (text+'').replace(/ /g,'-').replace(/[^\w-]+/g,'');
  },
  
  //converts text to a formatted query string
  convertToQueryString: function(text) {
  	if (text == undefined) return '';
  	return (text+'').replace(/\-+/g, '+').replace(/\s+/g, '+');
  },
  
  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return (text+'').replace(/\++/g, ' ').replace(/\-+/g, ' ');
  },
  
  //NOT USED for debugging - prints out data in a table
  getDataAsTable: function(json) {
    var rows = json["rows"];
    var cols = json["columns"];
    
    //concatenate the results into a string, you can build a table here
    var fusiontabledata = "<table><tr>";
    for(i = 0; i < cols.length; i++) {
      fusiontabledata += "<td>" + cols[i] + "</td>";
    }
    fusiontabledata += "</tr>";
    
    for(i = 0; i < rows.length; i++) {
    	fusiontabledata += "<tr>";
      for(j = 0; j < cols.length; j++) {
        fusiontabledata += "<td>" + rows[i][j] + "</td>";
      }
      fusiontabledata += "</tr>";
    }
    fusiontabledata += "</table>";  
    console.log(fusiontabledata);
  }
}