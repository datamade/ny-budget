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

BudgetColl.getTotals = function(dept_id, year, category){
    var total = [];
    if (dept_id == 'all'){
        this.forEach(function(item){
            var amount = item.get(category + ' ' + year);
            total.push(accounting.unformat(amount));
        });
    } else {
        this.where({'Department ID': dept_id}).forEach(function(item){
            var amount = item.get(category + ' ' + year);
            total.push(accounting.unformat(amount));
        })
    }
    return total.reduce(function(a,b){return a + b});
}

BudgetColl.getDeptSummary = function(dept_id){
    var dept_full = this.where({'Department ID': dept_id});
    var summary = {};
    var self = this;
    dept_full.forEach(function(item){
        summary['Department'] = item.get('Department');
        summary['Expenditures'] = self.getTotals(dept_id, '2012', 'Expenditures');
        summary['Appropriations'] = self.getTotals(dept_id, '2012', 'Appropriations');
        summary['Department ID'] = dept_id;
    });
    return summary;
}

var app_router = new AppRouter;
app_router.on('route:defaultRoute', function (actions) {
    d3.csv('data/macoupin_budget_cleaned.csv', function(rows){
        BudgetColl.reset(rows);
        BudgetLib.appropTotalArray = [];
        BudgetLib.expendTotalArray = [];
        $.each(BudgetLib.getYearRange(), function(i,year){
            BudgetLib.expendTotalArray.push(BudgetColl.getTotals('all', year, 'Expenditures'));
            BudgetLib.appropTotalArray.push(BudgetColl.getTotals('all', year, 'Appropriations'));
        });
        var expTotal = BudgetLib.expendTotalArray.slice();
        var appropTotal = BudgetLib.appropTotalArray.slice();
        var currentApprop = appropTotal[appropTotal.length - 1];
        var currentExp = expTotal[expTotal.length - 1];
        BudgetHighcharts.updateMainChart();
        BudgetLib.updateHeader(BudgetLib.title, 'Fund');
        BudgetLib.updateScorecardDescription([]);
        BudgetLib.updateScorecard(currentExp, currentApprop);
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
