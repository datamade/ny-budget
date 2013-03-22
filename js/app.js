//cookies for first time visitors
$("body").bind("click", function(e){
  $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
  $("#readme").fadeOut("fast");
});

if ($.cookie("budgetbreakdownreadme") != "read") {
  $("#readme").fadeIn("fast");
}

// main application handler
var AppRouter = Backbone.Router.extend({
    routes: {
        ":mode/:name/:year(/:viewChart)": "routeView",
        "*actions": "defaultRoute"
    }
});

// Instantiate the router
var app_router = new AppRouter;
app_router.on('route:routeView', function (mode, name, year, viewChart) {
    BudgetLib.updateView(mode, name, year, viewChart, true); 
});
app_router.on('route:defaultRoute', function (actions) {
    BudgetLib.updateView('home', 'default', 2013, 'list', true); 
});

// Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();  