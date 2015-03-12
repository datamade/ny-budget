app.Router = Backbone.Router.extend({
    // Maybe the thing to do here is to construct a separate route for
    // the two different top level views. So, fund-detail and control-officer-detail
    // or something. That would require making sure the correct route is
    // triggered when links are clicked. Not impossible but probably cleaner
    routes: {
        "(?:q)": "defaultRoute"
    },
    initialize: function(options){
        // console.log("*** in Router initialize")
        this.collection = options.collection;
    },
    defaultRoute: function(q){
        // console.log("*** in Router defaultRoute")
        var params = this.string2params(q)
        this.collection.bootstrap(params.year, params.figures);
    },
    string2params: function(q){
        var params = {
            'year': activeYear,
            'figures': 'nominal',
            'breakdown': 'Function'
        }
        if (q){
            if (q[0] == '?') q = q.slice(1)
            url_params = q.split('&')
            $(url_params).each(function(i, param){
                split = param.split('=')
                params[split[0]] = split[1].replace('+', ' ')
            });
        }
        return params
    },
    params2string: function(params){
        param_string = ''
        $(['year', 'figures', 'breakdown', 'filter_1', 'filter_2']).each(function(i,p){
            if (params[p] && param_string){
                param_string = param_string+'&'+p+'='+params[p]
            }
            else if (params[p]){
                param_string = p+'='+params[p]
            }
        })
        param_string = param_string.replace(/ /g,"+");
        return param_string
    }
});