(function($){

  //OLD STUFF - remove
  //cookies for first time visitors
  $("body").bind("click", function(e){
    $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
    $("#readme").fadeOut("fast");
  });

  if ($.cookie("budgetbreakdownreadme") != "read") {
    $("#readme").fadeIn("fast");
  }

  // **ListView class**: Our main app view.
  var BudgetView = Backbone.View.extend({    
    initialize: function(){
      _.bindAll(this, 'render'); // fixes loss of context for 'this' within methods
       
       this.render(); // not all views are self-rendering. This one is.
    },
    render: function(){
      BudgetLib.updateDisplay(null, null, null, null, true);
    }
  });

  // **listView instance**: Instantiate main app view.
  var budgetView = new BudgetView();      
})(jQuery);