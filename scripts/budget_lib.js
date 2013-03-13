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
  loadYear: 2013, //viewing year
  majorView: "", //viewing minor function
  minorView: "", //viewing minor function
  arraysLoaded: 0,

  //-------------front end display functions-------------------
  
  //primary load for graph and table
  updateDisplay: function(viewMode, year, fund, officer, externalLoad) {
    //load in values and update internal variables
    var viewChanged = false;
    if (BudgetLib.minorView != BudgetHelpers.convertToPlainString(fund))
    viewChanged = true;
    
    if (fund != null && fund != "") BudgetLib.minorView = BudgetHelpers.convertToPlainString(fund);
    else BudgetLib.minorView = '';
    
    if (year != null && year != "") BudgetLib.loadYear = year;
  
    //show fund view
    if (BudgetLib.minorView != ""){
      if (viewChanged || externalLoad) {
        window.scrollTo(0, 0);
        BudgetQueries.getTotalArray(BudgetLib.minorView, 'Minor Function', true, "BudgetLib.updateAppropTotal");
        BudgetQueries.getTotalArray(BudgetLib.minorView, 'Minor Function', false, "BudgetLib.updateExpendTotal");
      }
      
      BudgetQueries.getAgencies(BudgetLib.minorView, 'Minor Function', BudgetLib.loadYear, "BudgetLib.getDataAsBudgetTable");
      BudgetLib.updateHeader(BudgetLib.minorView, 'Agency');
      BudgetQueries.getTotalsForYear(BudgetLib.minorView, 'Minor Function', BudgetLib.loadYear, "BudgetLib.updateScorecard");
      BudgetQueries.getFundDescription(BudgetLib.minorView, "BudgetLib.updateScorecardDescription");
    }
    else { //load default view
      if (viewChanged || externalLoad) {
        BudgetQueries.getTotalArray('', '', true, "BudgetLib.updateAppropTotal");
        BudgetQueries.getTotalArray('', '', false, "BudgetLib.updateExpendTotal");
      }
      
      BudgetQueries.getAllFundsForYear(BudgetLib.loadYear, "BudgetLib.getDataAsBudgetTable");
      $('#breakdown-item-title span').html('Minor Function');
      
      $('#breakdown-nav a').address();
      
      BudgetLib.updateHeader(BudgetLib.title, 'Minor Function');
      BudgetQueries.getTotalsForYear('', '', BudgetLib.loadYear, "BudgetLib.updateScorecard");
      BudgetQueries.getFundDescription(BudgetLib.minorView, "BudgetLib.updateScorecardDescription");
    }
    $('#breadcrumbs a').address();
  },  
  
  updateHeader: function(view, subtype){
    $('h1').html(view);
    if (view != BudgetLib.title) {
      $('#breadcrumbs').html("<a href='/?year=" + BudgetLib.loadYear + "' rel='address:/?year=" + BudgetLib.loadYear + "'>&laquo back to " + BudgetLib.title + "</a>");
      $("#breakdown-nav").html("");
    }
    else
      $('#breadcrumbs').html("");
    
    $('#secondary-title').html(BudgetLib.loadYear + ' ' + view);
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
      
      $('.adr').address(); //after adding the table rows, initialize the address plugin on all the links
      
      BudgetLib.breakdownTable = $("#breakdown").dataTable({
        "aaSorting": [[1, "desc"]],
        "aoColumns": [
          null,
          { "sType": "currency" },
          { "sType": "currency" },
          { "bSortable": false }
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
      $(detail).insertAfter($('#' + itemId));
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
      else if (BudgetLib.minorView == '') {
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
      $('#scorecard .nominal').fadeOut('fast', function(){
        $('#scorecard .nominal').html(rows[0][0]);
        $('#scorecard .nominal').formatCurrency();
      }).fadeIn('fast');
      
      $('#scorecard .actual').fadeOut('fast', function(){
        $('#scorecard .actual').html(rows[0][1]);
        $('#scorecard .actual').formatCurrency();
        
        if (BudgetLib.loadYear == BudgetLib.endYear && rows[0][1] == 0) {
          $('#scorecard .actual').append("<sup class='ref'>&dagger;</sup>");
          $('#f-zero2011').show();
        } 
        else $('#f-zero2011').hide();
      }).fadeIn();
      
      if (cols.length > 2) {
        var nominalTop = rows[0][2];
        var actualTop = rows[0][3];
        var nominalBottom = rows[0][4];
        var actualBottom = rows[0][5];
        
        if (nominalTop > 0 && nominalBottom > 0) {
          var nominalPercent = (((nominalTop / nominalBottom) - 1) * 100).toFixed(1);
          if (nominalPercent > -0.05) nominalPercent = '+' + nominalPercent;
          
          $('#nominal-percent').hide().html('<strong>' + nominalPercent + '%</strong> nominal from ' + (BudgetLib.loadYear - 1)).fadeIn();
        }
        else $('#nominal-percent').fadeOut();
        
        if (actualTop > 0 && actualBottom > 0) {
          var actualPercent = (((actualTop / actualBottom) - 1) * 100).toFixed(1);
          if (actualPercent > -0.05) actualPercent = '+' + actualPercent;
          
          $('#actual-percent').hide().html('<strong>' + actualPercent + '%</strong> actual from ' + (BudgetLib.loadYear - 1)).fadeIn();
        }
        else $('#actual-percent').fadeOut();
      }
    }
  },
  
  //builds out budget breakdown (secondary) table
  getDataAsBudgetTable: function(json) {
    var rows = json["rows"];
    var cols = json["columns"];  
    var fusiontabledata;

    for(i = 0; i < rows.length; i++) {
      var rowName = rows[i][0];
      var AgencyId = 0;
      if (cols.length > 4)
        AgencyId = rows[i][4];
      var year = cols[3];
      var nominal = rows[i][1];
      var actual = rows[i][2];
      
      var rowId = BudgetHelpers.convertToSlug(rowName);
      var detailLoadFunction = "BudgetLib.getFundDetails(\"" + BudgetHelpers.convertToSlug(rowName) + "\");";
      
      if (BudgetLib.minorView != null && BudgetLib.minorView != "") {
        rowId = "Agency-" + AgencyId;
        detailLoadFunction = "BudgetLib.getAgencyDetails(\"Agency-" + AgencyId + "\");";
      }
      else if (BudgetLib.viewByOfficer)
        detailLoadFunction = "BudgetLib.getControlOfficerDetails(\"" + BudgetHelpers.convertToSlug(rowName) + "\");";
      
      if (nominal != 0 || actual != 0) {
        fusiontabledata += BudgetHelpers.generateTableRow(rowId, detailLoadFunction, rowName, nominal, actual);
      }
    }
 
    BudgetLib.breakdownData = fusiontabledata;
    BudgetLib.updateTable();
  },
  
  //shows fund details when row is clicked
  getFundDetails: function(itemId) {  
    var fusiontabledata = BudgetHelpers.generateExpandedRow(itemId, 'minor');
    BudgetLib.updateDetail(itemId, fusiontabledata);
    BudgetQueries.getFundDescription(BudgetHelpers.convertToPlainString(itemId), "BudgetLib.updateExpandedDescription");
    BudgetQueries.getTotalArray(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', true, "BudgetLib.updateSparkAppropTotal");
    BudgetQueries.getTotalArray(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', false, "BudgetLib.updateSparkExpendTotal");
    BudgetQueries.getSparklinePercentages(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', BudgetLib.loadYear, "BudgetLib.updateSparklinePercentages");
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
    var linkToWebsite = rows[0][2];
    var description = rows[0][3];
    var majorFunction = rows[0][4];
    var minorFunction = rows[0][5];
     
    var fusiontabledata = BudgetHelpers.generateExpandedDeptRow(agencyId, agency, description, linkToWebsite, majorFunction, minorFunction);
    BudgetLib.updateDetail('Agency-' + agencyId, fusiontabledata);
    
    BudgetQueries.getTotalArray(agencyId, 'Agency ID', true, "BudgetLib.updateSparkAppropTotal");
    BudgetQueries.getTotalArray(agencyId, 'Agency ID', false, "BudgetLib.updateSparkExpendTotal");
    BudgetQueries.getSparklinePercentages(agencyId, 'Agency ID', BudgetLib.loadYear, "BudgetLib.updateSparklinePercentages"); 
  },
  
  //updates percentages that display below the expanded row sparkling
  updateSparklinePercentages: function(json) {
    var rows = json["rows"];
    var cols = json["columns"]; 

    if (rows.length > 0)
    {
      var nominalTop = rows[0][0];
      var actualTop = rows[0][1];
      var nominalBottom = rows[0][2];
      var actualBottom = rows[0][3];
      
      if (nominalTop > 0 && nominalBottom > 0) {
        var nominalPercent = (((nominalTop / nominalBottom) - 1) * 100).toFixed(1);
        if (nominalPercent >= -0.05) nominalPercent = '+' + nominalPercent;
        $('#sparkline-nominal').hide().html('<strong>' + nominalPercent + '%</strong> nominal from ' + (BudgetLib.loadYear - 1)).fadeIn();
      }
      else $('#sparkline-nominal').fadeOut();
      
      if (actualTop > 0 && actualBottom > 0) {
        var actualPercent = (((actualTop / actualBottom) - 1) * 100).toFixed(1);
        if (actualPercent >= -0.05) actualPercent = '+' + actualPercent;
        $('#sparkline-actual').hide().html('<strong>' + actualPercent + '%</strong> actual from ' + (BudgetLib.loadYear - 1)).fadeIn();
      }
      else $('#sparkline-actual').fadeOut();
    }
  }
}