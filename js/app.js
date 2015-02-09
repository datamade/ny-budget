var collection = new app.BudgetColl();
var app_router = new app.Router({collection: collection});
Backbone.history.start();
$(document).ready(function() {
    $("body").tooltip({ selector: '[data-toggle=tooltip]' });
});