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

BudgetColl.getTotalExp = function(year){
    var total = []
    this.forEach(function(item){
        var amount = item.get('Expenditures ' + year);
        total.push(accounting.unformat(amount));
    })
    return total.reduce(function(a,b){return a + b});
}

BudgetColl.getTotalApprop = function(year){
    var total = [];
    this.forEach(function(item){
        var amount = item.get('Appropriations ' + year);
        total.push(accounting.unformat(amount));
    });
    return total.reduce(function(a,b){return a + b});
}

var app_router = new AppRouter;
app_router.on('route:defaultRoute', function (actions) {
    d3.csv('data/macoupin_budget_cleaned.csv', function(rows){
        BudgetColl.reset(rows);
        BudgetLib.appropTotalArray = []
        BudgetLib.expendTotalArray = []
        var year = BudgetLib.startYear;
        while (year <= BudgetLib.endYear){
            BudgetLib.expendTotalArray.push(BudgetColl.getTotalExp(year));
            BudgetLib.appropTotalArray.push(BudgetColl.getTotalApprop(year));
            year ++;
        }
        BudgetHighcharts.updateMainChart();
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

// Additional setup
$("#search-query").ezpz_hint();

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
});
