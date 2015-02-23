app.Router = Backbone.Router.extend({
    // Maybe the thing to do here is to construct a separate route for
    // the two different top level views. So, fund-detail and control-officer-detail
    // or something. That would require making sure the correct route is
    // triggered when links are clicked. Not impossible but probably cleaner
    routes: {
        "function-detail/:topName(/:secondName)": "functionDetailRoute",
        "fund-type-detail/:topName(/:secondName)": "fundTypeDetailRoute",
        "(?:q)": "defaultRoute"
    },
    initialize: function(options){
        console.log("*** in Router initialize")
        this.collection = options.collection;
    },
    defaultRoute: function(q){
        console.log("*** in Router defaultRoute")
        $('#secondary-title').text('Function');
        var params = this.string2params(q)
        this.collection.bootstrap([params.breakdown], params.year, params.figures);
    },
    functionDetailRoute: function(topName, secondName){
        console.log("*** in Router functionDetailRoute")
        var initYear = this.getInitYear('Function', topName, secondName);
        var init = initYear[0];
        var year = initYear[1];
        this.collection.bootstrap(init, year, 'real'); // ***CHANGE THIS
    },
    fundTypeDetailRoute: function(topName, secondName){
        console.log("*** in Router fundTypeDetailRoute")
        $('#secondary-title').text('Fund Type');
        var initYear = this.getInitYear('Fund Type', topName, secondName);
        var init = initYear[0];
        var year = initYear[1];
        this.collection.bootstrap(init, year, 'real'); // ***CHANGE THIS
    },
    getInitYear: function(view, topName, secondName){ // ***GET RID OF THIS
        var init = [view];
        var top = topName;
        var idx = topName.indexOf('?');
        var year = undefined;
        if (idx >= 0){
            top = topName.slice(0, idx);
            year = topName.slice(idx+1, topName.length).replace('year=', '');
        }
        init.push(top);
        if(secondName){
            var second = secondName;
            var idx = secondName.indexOf('?');
            if (idx >= 0){
                second = secondName.slice(0, idx);
                year = secondName.slice(idx+1, secondName.length).replace('year=', '');
            }
            init.push(second);
        }
        return [init, year]
    },
    string2params: function(q){
        //these are the default params
        params = {
            'year': activeYear,
            'figures': 'real',
            'breakdown':  'Function'
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
        $(['year', 'figures', 'breakdown']).each(function(i,p){
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