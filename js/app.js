// Backbone app routing

// main application handler
var AppRouter = Backbone.Router.extend({
    routes: {
        "search/:query": "routeSearch",
        ":mode/:name/:year(/:viewChart)": "routeView",
        "*actions": "defaultRoute"
    }
});

// Instantiate the router
var app_router = new AppRouter;
app_router.on('route:routeSearch', function (query) {
    BudgetLib.renderSearch(query); 
});
app_router.on('route:routeView', function (mode, name, year, viewChart) {
    BudgetLib.updateView(mode, name, year, viewChart, true); 
});
app_router.on('route:defaultRoute', function (actions) {
    BudgetLib.updateView('home', 'default', 2013, 'list', true); 
});

// Start Backbone history a necessary step for bookmarkable URL's
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