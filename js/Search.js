app.SearchView = Backbone.View.extend({
    el: $('#search-form'),
    initialize: function(){
        console.log("*** in SearchView initialize")
        var search_options = {
            keys: ['Expense Line'],
            threshold: 0.4
        }
        this.Search = new Fuse(collection.toJSON(), search_options);
        this.render();
    },
    events: {
        'click #search': 'engage'
    },
    render: function(){
        console.log("*** in SearchView render")
        this.$el.html(BudgetHelpers.template_cache('search'));
    },
    engage: function(e){
        console.log("*** in SearchView engage")
        e.preventDefault();
        var input = $(e.currentTarget).parent().prev();
        var term = $(input).val();
        var results = this.Search.search(term);
        if (debugMode == true){
            console.log("results");
            console.log(results);
        }
    }
});