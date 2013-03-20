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
        "year/:year": "loadYear",
        ":mode/:name/:year": "loadView",
        "*actions": "defaultRoute" // Backbone will try match the route above first
    }
});

// Instantiate the router
var app_router = new AppRouter;
app_router.on('route:loadYear', function (year) {
    BudgetLib.initialize(null, null, year, true); 
});
app_router.on('route:loadView', function (mode, name, year) {
    BudgetLib.initialize(mode, name, year, true); 
});
app_router.on('route:defaultRoute', function (actions) {
    BudgetLib.initialize(null, null, null, true); 
});
// Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();  