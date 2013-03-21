/*!
 * Look at Cook Budget Display library
 * http://lookatcook.com/
 *
 * Copyright 2012, Derek Eder and Nick Rougeux
 * Licensed under the MIT license.
 * https://github.com/open-city/look-at-cook/wiki/License
 *
 * Date: 3/24/2012
 *
 * This is where all the 'magic' happens. jQuery address detects changes in the URL, and 
 * calls the 'BudgetLib.updateDisplay' function which displays the appropriate data for that view.
 * 
 * Data is stored in Google Fusion tables, and fetches it using the Google visualization API
 * 
 * For display, the data is passed to Highcharts, another javascript library that specializes 
 * in graphs, and an HTML table which displays the budget broken down by Agency.
 * 
 * Every major function, minor function or agency that is clicked updates the URL query string using 
 * jQuery Address and the page loads the data dynamically.
 * 
 * Storing all of our data in Google Fusion Tables. For this visualization, I split it up in to 
 * 3 tables
 */

var BudgetLib = BudgetLib || {};  
var BudgetLib = {

  //IDs used to reference Fusion Tables, where we store our data
  FusionTableApiKey: "AIzaSyDgYMq5VzeWQdYNpvYfP0W3NuCKYOAB5_Y",
  BUDGET_TABLE_ID: "1lkIgEa1qFZiBEdxFgwWdIdHMzJ9vQN1nJEK_jcY", //main budget table with Actual/Nominal per Agency per year
  FUND_DESCRIPTION_TABLE_ID: "1DVnzs1tOFrVxrf6_jRFeXUe7b6lDYd5jh309Up4",
  OFFICER_DESCRIPTION_TABLE_ID: "1uSDhUpVbk3c7m0E7iT87LP8GfPk6vnczh-y64sI",
  
  title: "State of Washington Budget",
  startYear: 1990,
  endYear: 2013,

  // keep track of our state
  viewYear: 2013,  // viewing year
  viewMode: '',    // viewing mode - major or minor
  viewName: '',    // viewing friendly name
  arraysLoaded: 0,

  //-------------front end display functions-------------------
  
  //primary load for graph and table
  updateView: function(viewMode, viewName, viewYear, viewChart, externalLoad) {
    // console.log(viewMode);
    // console.log(viewName);
    // console.log(viewYear);
    //load in values and update internal variables    
    if (viewName != null) 
      BudgetLib.viewName = BudgetHelpers.convertToPlainString(viewName);
    else 
      BudgetLib.viewName = '';
    
    if (viewYear != null) 
      BudgetLib.viewYear = viewYear;

    if (viewChart != null && viewChart == 'pie') {
      $("#breakdown-nav").html("\
        <ul>\
          <li><a href='#/year/" + BudgetLib.viewYear + "'>View as list</a></li>\
          <li class='current'>View as pie chart</li>\
        </ul>");

      $('#breakdown').hide();
      $('#pie').show();

    }
    else {
      $("#breakdown-nav").html("\
        <ul>\
          <li class='current'>View as list</li>\
          <li><a href='#/year/" + BudgetLib.viewYear + "/pie'>View as pie chart</a></li>\
        </ul>");

      $('#breakdown').show();
      $('#pie').hide();
    }
  
    //show viewName view
    if (BudgetLib.viewName != ""){
      if (externalLoad) {
        window.scrollTo(0, 0);
        BudgetQueries.getTotalArray(BudgetLib.viewName, 'Minor Function', true, "BudgetLib.updateAppropTotal");
        BudgetQueries.getTotalArray(BudgetLib.viewName, 'Minor Function', false, "BudgetLib.updateExpendTotal");
      }
      
      BudgetQueries.getAgencies(BudgetLib.viewName, 'Minor Function', BudgetLib.viewYear, "BudgetLib.getDataAsBudgetTable");
      BudgetLib.updateHeader(BudgetLib.viewName, 'Agency');
      BudgetQueries.getTotalsForYear(BudgetLib.viewName, 'Minor Function', BudgetLib.viewYear, BudgetLib.endYear, "BudgetLib.updateScorecard");
      BudgetQueries.getFundDescription(BudgetLib.viewName, "BudgetLib.updateScorecardDescription");
    }
    else { //load default view
      if (externalLoad) {
        BudgetQueries.getTotalArray('', '', true, "BudgetLib.updateAppropTotal");
        BudgetQueries.getTotalArray('', '', false, "BudgetLib.updateExpendTotal");
      }
      
      BudgetQueries.getAllFundsForYear(BudgetLib.viewYear, "BudgetLib.getDataAsBudgetTable");
      $('#breakdown-item-title span').html('Minor Function');
      
      BudgetLib.updateHeader(BudgetLib.title, 'Minor Function');
      BudgetQueries.getTotalsForYear('', '', BudgetLib.viewYear, BudgetLib.endYear, "BudgetLib.updateScorecard");
      BudgetQueries.getFundDescription(BudgetLib.viewName, "BudgetLib.updateScorecardDescription");
    }
  },  

  updateYear: function(clickedYear, updateView) {
    if (BudgetLib.viewMode != "" && BudgetLib.viewName != "") {
      app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear), {trigger: false});
      BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, updateView);
    }
    else {
      app_router.navigate(('/year/' + clickedYear), {trigger: false});
      BudgetLib.updateView(null, null, clickedYear, updateView);
    }
  },
  
  updateHeader: function(view, subtype){
    $('h1').html(view);
    if (view != BudgetLib.title) {
      $('#breadcrumbs').html("<a href='#/year/" + BudgetLib.viewYear + "'>&laquo back to " + BudgetLib.title + "</a>");
      $("#breakdown-nav").html("");
    }
    else
      $('#breadcrumbs').html("");
    
    $('#secondary-title').html(BudgetLib.viewYear + ' ' + view);
    $('#breakdown-item-title span').html(subtype);
  },
    
  //displays secondary datatables fund/Agency listing
  updateTable: function() {
    $('#breakdown').fadeOut('fast', function(){
      if (BudgetLib.breakdownTable != null) BudgetLib.breakdownTable.fnDestroy();
      
      $('#breakdown tbody').children().remove();
      $('#breakdown > tbody:last').append(BudgetLib.breakdownData);
      
      var maxArray = new Array();
      $('.nominal.num').each(function(){
        maxArray.push(parseInt($(this).html()));
      });
      $('.actual.num').each(function(){
        maxArray.push(parseInt($(this).html()));
      });
      
      var maxNominal = Math.max.apply( Math, maxArray );
      if (maxNominal > 0) {
        $('.nominal.num').each(function(){
          $(this).siblings().children().children('.nominal.outer').width((($(this).html()/maxNominal) * 100) + '%');
        });
        $('.actual.num').each(function(){
          $(this).siblings().children().children('.actual.inner').width((($(this).html()/maxNominal) * 100) + '%');
        });
      }
      $('.nominal.num').formatCurrency();
      $('.actual.num').formatCurrency();
      
      //$('.adr').address(); //after adding the table rows, initialize the address plugin on all the links
      
      BudgetLib.breakdownTable = $("#breakdown").dataTable({
        "aaSorting": [[1, "desc"]],
        "aoColumns": [
          null,
          { "sType": "currency" },
          { "sType": "currency" }
        ],
        "bFilter": false,
        "bInfo": false,
        "bPaginate": false
      });
    }).fadeIn('fast');
  },
  
  //show/hide expanded detail for a clicked row
  updateDetail: function(itemId, detail) {
    if (BudgetLib.sparkChart != null) {
      BudgetLib.sparkChart.destroy();
      BudgetLib.sparkChart = null;
    }
    
    if ($('#' + itemId + '-expanded').length == 0) {
      $('.budget-expand-img').attr('src', 'images/expand.png');
      $('#breakdown .expanded-content').remove();
      $('#breakdown tr').removeClass('expanded-head');
      $('#' + itemId + ' .budget-expand-img').attr('src', 'images/collapse.png');
      $('#' + itemId).after(detail);
      $('#' + itemId).addClass('expanded-head');
    }
    else {
      $('.budget-expand-img').attr('src', 'images/expand.png');
      $('#breakdown .expanded-content').remove();
      $('#breakdown tr').removeClass('expanded-head');
    }
  },

  //----------display callback functions----------------
  
  //these all work by being called (callback function) once Fusion Tables returns a result. 
  //the function then takes the json and handles updating the page
  updateAppropTotal: function(json) {
    BudgetLib.appropTotalArray = BudgetHelpers.getDataAsArray(json);
    BudgetHighcharts.updateMainChart();
  },
  
  updateExpendTotal: function(json) {
    BudgetLib.expendTotalArray = BudgetHelpers.getDataAsArray(json);
    BudgetHighcharts.updateMainChart();
  },
  
  updateSparkAppropTotal: function(json) {
    BudgetLib.sparkAppropTotalArray = BudgetHelpers.getDataAsArray(json);
    BudgetHighcharts.updateSparkline();
  },
  
  updateSparkExpendTotal: function(json) {
    BudgetLib.sparkExpendTotalArray = BudgetHelpers.getDataAsArray(json);
    BudgetHighcharts.updateSparkline();
  },
  
  //shows the description of the current view below the main chart
  updateScorecardDescription: function(json) { 
    var rows = json["rows"];
    var cols = json["columns"];

    if(rows != undefined) {
      $("#f-officers").hide();
      
      if (rows.length > 0) {
        $('#scorecard-desc p').hide().html(rows[0][0]).fadeIn();
      }
      else if (BudgetLib.viewName == '') {
        $('#scorecard-desc p').hide().html('Breakdown by minor function').fadeIn();
      }
      else $('#scorecard-desc p').html('');
    }
  },
  
  //shows totals and percentage changes of the current view below the main chart
  updateScorecard: function(json) {   
    var rows = json["rows"];
    var cols = json["columns"];
    if (rows.length > 0) {
      var nominalCurrent = rows[0][0];
      var actualCurrent = rows[0][1];
      var nominalCompare = rows[0][2];
      var actualCompare = rows[0][3];

      $('#scorecard .nominal').fadeOut('fast', function(){
        $('#scorecard .nominal').html(nominalCurrent);
        $('#scorecard .nominal').formatCurrency();
      }).fadeIn('fast');
      
      $('#scorecard .actual').fadeOut('fast', function(){
        $('#scorecard .actual').html(actualCurrent);
        $('#scorecard .actual').formatCurrency();
        
        if (BudgetLib.viewYear == BudgetLib.endYear && actualCurrent == 0) {
          $('#scorecard .actual').append("<sup class='ref'>&dagger;</sup>");
          $('#f-zero2011').show();
        } 
        else $('#f-zero2011').hide();
      }).fadeIn();
      
      if (cols.length > 2) {        
        if (actualCompare > 0 && actualCurrent > 0) {
          var actualPercent = (((actualCurrent / actualCompare) - 1) * 100).toFixed(1);
          if (actualPercent > -0.05) actualPercent = '+' + actualPercent;

          $('#actual-change-percent').hide().html('<strong>' + actualPercent + '%</strong> Real (Inflation-adjusted) from ' + (BudgetLib.endYear)).fadeIn();
        }
        else $('#actual-change-percent').fadeOut();
      }
    }
  },
  
  //builds out budget breakdown (secondary) table
  getDataAsBudgetTable: function(json) {
    var rows = json["rows"];
    var cols = json["columns"];  
    var budget_data;
    var pie_array = [];

    for(i = 0; i < rows.length; i++) {
      var rowName = rows[i][0];
      var AgencyId = 0;
      if (cols.length > 4)
        AgencyId = rows[i][4];
      var year = cols[3];
      var nominal = rows[i][1];
      var actual = rows[i][2];

      pie_array.push({name: rowName, y: actual})
      
      var rowId = BudgetHelpers.convertToSlug(rowName);
      var detailLoadFunction = "BudgetLib.getFundDetails(\"" + BudgetHelpers.convertToSlug(rowName) + "\");";
      
      if (BudgetLib.viewName != null && BudgetLib.viewName != "") {
        rowId = "Agency-" + AgencyId;
        detailLoadFunction = "BudgetLib.getAgencyDetails(\"Agency-" + AgencyId + "\");";
      }
      else if (BudgetLib.viewByOfficer)
        detailLoadFunction = "BudgetLib.getControlOfficerDetails(\"" + BudgetHelpers.convertToSlug(rowName) + "\");";
      
      if (nominal != 0 || actual != 0) {
        budget_data += BudgetHelpers.generateTableRow(rowId, detailLoadFunction, rowName, nominal, actual);
      }
    }
 
    BudgetLib.breakdownData = budget_data;
    BudgetLib.updateTable();

    BudgetHighcharts.updatePie("pie", pie_array, "Budget breakdown");
  },
  
  //shows fund details when row is clicked
  getFundDetails: function(itemId) {  
    var expanded_row = BudgetHelpers.generateExpandedRow(itemId, 'minor');
    BudgetLib.updateDetail(itemId, expanded_row);
    BudgetQueries.getFundDescription(BudgetHelpers.convertToPlainString(itemId), "BudgetLib.updateExpandedDescription");
    BudgetQueries.getTotalArray(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', true, "BudgetLib.updateSparkAppropTotal");
    BudgetQueries.getTotalArray(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', false, "BudgetLib.updateSparkExpendTotal");
    BudgetQueries.getSparklinePercentages(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', BudgetLib.viewYear, BudgetLib.endYear, "BudgetLib.updateSparklinePercentages");
  },
  
  //shows description in expanded row when row is clicked
  updateExpandedDescription: function(json) {
    var rows = json["rows"];
    var description = '';
    
    if (rows != undefined)
      description = rows[0][0];
    
    $('#expanded-description').hide().html(description).fadeIn();
  },
  
  //requests Agency details from Fusion Tables when row is clicked
  getAgencyDetails: function(AgencyId) {
    AgencyId = AgencyId.replace('Agency-', '')
    BudgetQueries.getAgencyDescription(AgencyId, "BudgetLib.updateAgencyDetails");
  },
  
  //shows Agency details when row is clicked
  updateAgencyDetails: function(json) {
    var rows = json["rows"];

    var agencyId = rows[0][0];
    var agency = rows[0][1];
    var description = rows[0][2];
    var majorFunction = rows[0][3];
    var minorFunction = rows[0][4];
     
    var fusiontabledata = BudgetHelpers.generateExpandedDeptRow(agencyId, agency, description, majorFunction, minorFunction);
    BudgetLib.updateDetail('Agency-' + agencyId, fusiontabledata);
    
    BudgetQueries.getTotalArray(agencyId, 'Agency ID', true, "BudgetLib.updateSparkAppropTotal");
    BudgetQueries.getTotalArray(agencyId, 'Agency ID', false, "BudgetLib.updateSparkExpendTotal");
    BudgetQueries.getSparklinePercentages(agencyId, 'Agency ID', BudgetLib.viewYear, BudgetLib.endYear, "BudgetLib.updateSparklinePercentages"); 
  },
  
  //updates percentages that display below the expanded row sparkling
  updateSparklinePercentages: function(json) {
    var rows = json["rows"];
    var cols = json["columns"]; 

    if (rows.length > 0) {
      var actualTop = rows[0][1];
      var actualBottom = rows[0][3];
      
      if (actualTop > 0 && actualBottom > 0) {
        var actualPercent = (((actualTop / actualBottom) - 1) * 100).toFixed(1);
        if (actualPercent >= -0.05) actualPercent = '+' + actualPercent;
        $('#sparkline-actual').hide().html('<strong>' + actualPercent + '%</strong> Real (Inflation-adjusted) from ' + BudgetLib.endYear).fadeIn();
      }
      else $('#sparkline-actual').fadeOut();
    }
  }
}