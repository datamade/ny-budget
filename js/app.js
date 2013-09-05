// Backbone app routing

// main application handler
var AppRouter = Backbone.Router.extend({
    routes: {
        "search/:query": "routeSearch",
        ":mode/:name/:year(/:viewChart)": "routeView",
        "*actions": "defaultRoute"
    }
});

var BudgetColl = new Backbone.Collection;

BudgetColl.getTotals = function(category, year, dept){
    var total = [];
    if (typeof dept === 'undefined'){
        var all = this.pluck(category + ' ' + year);
        total = all.reduce(function(a,b){return accounting.unformat(a) + accounting.unformat(b)});
    } else {
        dept.forEach(function(item){
            var amount = item.get(category + ' ' + year);
            total.push(accounting.unformat(amount));
        });
        total = total.reduce(function(a,b){return a + b});
    }
    return total;
}

BudgetColl.getDeptSummary = function(dept_id){
    var dept = this.where({'Department ID': dept_id});
    var summary = {};
    var self = this;
    var exp = self.getTotals('Expenditures', '2012', dept);
    var approp = self.getTotals('Appropriations', '2012', dept);
    dept.forEach(function(item){
        if (exp > 0 || approp > 0){
            summary['Department'] = item.get('Department');
            summary['Expenditures'] = exp;
            summary['Appropriations'] = approp;
            summary['Department ID'] = dept_id;
        } else {
            summary = null;
        }
    });
    return summary;
}

BudgetColl.getDeptIDs = function(){
    return this.pluck('Department ID').getUnique();
}

var app_router = new AppRouter;
app_router.on('route:defaultRoute', function (actions) {
    d3.csv('data/macoupin_budget_cleaned.csv', function(rows){
        BudgetColl.reset(rows);
        BudgetLib.appropTotalArray = [];
        BudgetLib.expendTotalArray = [];
        $.each(BudgetLib.getYearRange(), function(i,year){
            BudgetLib.expendTotalArray.push(BudgetColl.getTotals('Expenditures', year));
            BudgetLib.appropTotalArray.push(BudgetColl.getTotals('Appropriations', year));
        });
        var expTotal = BudgetLib.expendTotalArray.slice();
        var appropTotal = BudgetLib.appropTotalArray.slice();
        var currentApprop = appropTotal[appropTotal.length - 1];
        var currentExp = expTotal[expTotal.length - 1];
        BudgetHighcharts.updateMainChart();
        BudgetLib.updateHeader(BudgetLib.title, 'Department');
        BudgetLib.updateScorecardDescription([]);
        BudgetLib.updateScorecard(currentExp, currentApprop);
        var summaries = [];
        $.each(BudgetColl.getDeptIDs(), function(i, id){
            var summary = BudgetColl.getDeptSummary(id);
            if (summary){
                summaries.push(BudgetColl.getDeptSummary(id));
            }
        });
        BudgetLib.getDataAsBudgetTable(summaries);
    })
});


// Instantiate the router
//  app_router.on('route:routeSearch', function (query) {
//      BudgetLib.renderSearch(query);
//  });
//  app_router.on('route:routeView', function (mode, name, year, viewChart) {
//      BudgetLib.updateView(mode, name, year, viewChart, true);
//  });
//
//  // Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();

//cookies for first time visitors
$("body").bind("click", function(e){
  $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
  $("#readme").fadeOut("fast");
});

if ($.cookie("budgetbreakdownreadme") != "read") {
  $("#readme").fadeIn("fast");
}

// Firing events for search
$("#search-query").keydown(function(e){
  var key =  e.keyCode ? e.keyCode : e.which;
  if(key == 13) {
      $('#search').click();
      return false;
  }
});

$('#search').click(function(){
  var query = $('#search-query').val();
  app_router.navigate("search/" + query, {trigger: false});
  BudgetLib.renderSearch(query);
  return false;
});
