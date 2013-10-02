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

  startYear: 1995,
  endYear: 2012,

  // keep track of our state
  viewYear: 2012,  // viewing year
  viewMode: 'home',    // viewing mode - major or minor
  viewName: 'default',    // viewing friendly name
  viewChart: 'list',
  arraysLoaded: 0,


  //-------------front end display functions-------------------

  //primary load for graph and table
  updateView: function(viewMode, viewName, viewYear, viewChart, externalLoad) {
    // console.log(viewMode);
    // console.log(viewName);
    // console.log(viewYear);
    //load in values and update internal variables
    BudgetLib.viewMode = viewMode;
    BudgetLib.viewName = BudgetHelpers.convertToPlainString(viewName);
    BudgetLib.viewChart = viewChart;
    BudgetLib.viewYear = viewYear;

    BudgetLib.updateChartSelector();

    $('#main-chart').show();
    $('#search-query').val('');

    //show viewName view
    if (BudgetLib.viewMode != "home"){
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
        BudgetQueries.getTotalArray('', '', 'Expenditures');
        BudgetQueries.getTotalArray('', '', 'Appropriations');
      }

      BudgetQueries.getAllFundsForYear(BudgetLib.viewYear, "BudgetLib.getDataAsBudgetTable");
      $('#breakdown-item-title span').html('Minor Function');

      BudgetLib.updateHeader(BudgetLib.title, 'Minor Function');
      BudgetQueries.getTotalsForYear('', '', BudgetLib.viewYear, BudgetLib.endYear, "BudgetLib.updateScorecard");
      BudgetQueries.getFundDescription(BudgetLib.viewName, "BudgetLib.updateScorecardDescription");
    }
  },

  renderSearch: function(query) {
    // console.log(BudgetLib.viewMode);
    // console.log(BudgetLib.viewName);
    // console.log(BudgetLib.viewYear);

    BudgetLib.viewMode = 'search';
    BudgetLib.viewChart = 'list';

    $('#breakdown').show();
    $('#pie').hide();

    $('#main-chart').hide();
    $('#search-query').val(query);
    BudgetQueries.getAgenciesForQuery(query, BudgetLib.viewYear, "BudgetLib.getDataAsBudgetTable");
    BudgetLib.updateHeader("Search results for '" + query + "'", 'Agency');
  },

  updateChartSelector: function() {
    if (BudgetLib.viewChart == 'pie') {
      $("#breakdown-nav").html("\
        <ul>\
          <li>" + BudgetHelpers.getAddressLink(null, null, null, 'list', 'View as list') + "</li>\
          <li class='current'>View as pie chart</li>\
        </ul>");

      $('#breakdown').hide();
      $('#pie').show();

    }
    else {
      $("#breakdown-nav").html("\
        <ul>\
          <li class='current'>View as list</li>\
          <li>" + BudgetHelpers.getAddressLink(null, null, null, 'pie', 'View as pie chart') + "</li>\
        </ul>");

      $('#breakdown').show();
      $('#pie').hide();
    }
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
        "bPaginate": false,
        "bAutoWidth": false
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
        $('#secondary-description').hide().html(rows[0][0]).fadeIn();
      }
      else if (BudgetLib.viewMode == 'home') {
        $('#secondary-description').hide().html('Breakdown by minor function').fadeIn();
      }
      else $('#secondary-description').html('');
    }
  },

  //shows totals and percentage changes of the current view below the main chart
  updateScorecard: function(expenditures, appropriations) {
    $('#scorecard .appropriations').fadeOut('fast', function(){
      $('#scorecard .appropriations').html(appropriations);
      $('#scorecard .appropriations').formatCurrency();
    }).fadeIn('fast');

    $('#scorecard .expenditures').fadeOut('fast', function(){
      $('#scorecard .expenditures').html(expenditures);
      $('#scorecard .expenditures').formatCurrency();

    //if (BudgetLib.viewYear == BudgetLib.endYear && actualCurrent == 0) {
    //  $('#scorecard .expenditures').append("<sup class='ref'>&dagger;</sup>");
    //  $('#f-zero2011').show();
    //}
    //else $('#f-zero2011').hide();
    }).fadeIn();

   //if (cols.length > 2) {
   //   if (actualCompare > 0 && actualCurrent > 0) {
   //     var actualPercent = (((actualCompare / actualCurrent) - 1) * 100).toFixed(1);
   //               if (actualPercent > 0) actualPercent = '+' + actualPercent;

   //     $('#actual-change-percent').hide().html('<strong>' + actualPercent + '% </strong>change from '  + (BudgetLib.viewYear) + ' to ' + (BudgetLib.endYear) + ' (Real)').fadeIn();
   //   }
   //   else $('#actual-change-percent').fadeOut();
   // }
  },

  //builds out budget breakdown (secondary) table
  getDataAsBudgetTable: function(json) {
    var budget_data = '';
    $.each(json, function(i, row){
        var rowName = row['Department'];
        var rowId = BudgetHelpers.convertToSlug(rowName);
        var detailedLoadFunction = "BudgetLib.getFundDetails(\"" + rowId + "\");";
        var expenditures = accounting.formatMoney(row['Expenditures']);
        var appropriations = accounting.formatMoney(row['Appropriations']);
        budget_data += BudgetHelpers.generateTableRow(rowId, detailedLoadFunction, rowName, appropriations, expenditures);
    });
    BudgetLib.breakdownData = budget_data;
    BudgetLib.updateTable();
  },

  //shows fund details when row is clicked
  getFundDetails: function(itemId) {
    var expanded_row = BudgetHelpers.generateExpandedRow(itemId, 'minor');
    BudgetLib.updateDetail(itemId, expanded_row);
    var desc = BudgetColl.findWhere({'Department': itemId});
    $('#expanded-description').hide().html(desc).fadeIn();
    // BudgetQueries.getFundDescription(BudgetHelpers.convertToPlainString(itemId), "BudgetLib.updateExpandedDescription");
    // BudgetQueries.getTotalArray(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', true, "BudgetLib.updateSparkAppropTotal");
    // BudgetQueries.getTotalArray(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', false, "BudgetLib.updateSparkExpendTotal");
    // BudgetQueries.getSparklinePercentages(BudgetHelpers.convertToPlainString(itemId), 'Minor Function', BudgetLib.viewYear, BudgetLib.endYear, "BudgetLib.updateSparklinePercentages");
  },

  //shows description in expanded row when row is clicked
  updateExpandedDescription: function(json) {
    // console.log(json);
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
    var linkToWebsite = rows[0][3]
    var majorFunction = rows[0][4];
    var minorFunction = rows[0][5];

    var fusiontabledata = BudgetHelpers.generateExpandedDeptRow(agencyId, agency, description, linkToWebsite, majorFunction, minorFunction);
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
        var actualPercent = (((actualBottom / actualTop) - 1) * 100).toFixed(1);
        if (actualPercent >= -0.05) actualPercent = '+' + actualPercent;
        $('#sparkline-actual').hide().html('<strong>' + actualPercent + '%</strong> change from ' + BudgetLib.viewYear + ' to ' + BudgetLib.endYear).fadeIn();
      }
      else $('#sparkline-actual').fadeOut();
    }
  }
}
