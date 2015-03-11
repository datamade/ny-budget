app.BudgetCollection = Backbone.Collection.extend({
    startYear: startYear,
    endYear: endYear,
    activeYear: activeYear,
    updateYear: function(year, yearIndex){
        var expanded = [];
        $.each($('tr.expanded-content'), function(i, row){
            var name = $(row).prev().find('a.rowName').text();
            expanded.push(name);
            $(row).remove();
        })
        this.mainChartData.setYear(year, yearIndex);
        this.breakdownChartData.setRows(year, yearIndex, this.mainChartData.get('isInflationAdjusted'));
        this.dataTable.fnDestroy();
        this.initDataTable();
        this.hideMissing();
        $.each(expanded, function(i, name){
            var sel = 'a.details:contains("' + name + '")';
            $(sel).first().trigger('click');
        })
    },
    updateTables: function(view, title, filter, year, isInflationAdjusted){

        var url_hash = window.location.hash;
        var url_q = ''
        if(url_hash.indexOf('?') >= 0){
            url_q = url_hash.slice(url_hash.indexOf('?'))
        }
        var url_params = app_router.string2params(url_q)


        // Various cleanup is needed when running this a second time.
        if(typeof this.mainChartView !== 'undefined'){
            this.mainChartView.undelegateEvents();
        }
        if($('#breakdown-table-body').html() != ''){
            $('#breakdown-table-body').empty();
        }
        if(typeof this.dataTable !== 'undefined'){
            this.dataTable.fnClearTable();
            this.dataTable.fnDestroy();
        }
        // Need to orientate the views to a top level
        if(typeof this.hierarchy[view] !== 'undefined'){
            this.topLevelView = view
        } else {
            this.bdView = view;
        }
        $('#secondary-title').text(this.topLevelView);

        if (typeof year === 'undefined'){
            year = this.activeYear;
        }
        var actual = [];
        var est = [];
        var self = this;
        var values = this.toJSON();
        if (debugMode == true){
            console.log("Update Tables");
            console.log(this);
        }
        var incomingFilter = false;
        if (typeof filter !== 'undefined'){
            values = _.where(this.toJSON(), filter);
            incomingFilter = true;
        }
        var yearRange = this.getYearRange()
        //loop through years in range & get estimated & actual values for line chart
        $.each(yearRange, function(i, year){
            actual_col_name = BudgetHelpers.getColumnName(year, actualTitle);
            est_col_name = BudgetHelpers.getColumnName(year, estTitle);

            actual.push(self.getTotals(values, actual_col_name));
            est.push(self.getTotals(values, est_col_name));
        });
        var yearIndex = yearRange.indexOf(parseInt(year))

        // this is the data for the summary section
        var sel_actual_sum = actual[yearIndex];
        var prev_actual_sum = actual[yearIndex - 1];
        var sel_est_sum = est[yearIndex]
        var prev_est_sum = est[yearIndex - 1]
        if(isInflationAdjusted){
            sel_actual_sum = BudgetHelpers.inflationAdjust(sel_actual_sum, year, benchmark)
            sel_est_sum = BudgetHelpers.inflationAdjust(sel_est_sum, year, benchmark)
            prev_actual_sum = BudgetHelpers.inflationAdjust(prev_actual_sum, year-1, benchmark)
            prev_est_sum = BudgetHelpers.inflationAdjust(prev_est_sum, year-1, benchmark)
        }

        var actualChange = BudgetHelpers.calc_change(sel_actual_sum, prev_actual_sum);
        var estChange = BudgetHelpers.calc_est_change(sel_actual_sum, prev_est_sum, prev_actual_sum);
        this.mainChartData = new app.MainChartModel({
            actuals: actual,
            estimates: est,
            title: title,
            viewYear: year,
            prevYear: year-1,
            viewYearRange: BudgetHelpers.convertYearToRange(year),
            prevYearRange: BudgetHelpers.convertYearToRange(year-1),
            selectedActual: BudgetHelpers.convertToMoney(sel_actual_sum),
            selectedEst: BudgetHelpers.convertToMoney(sel_est_sum),
            // this is the +/- percentage summary below main line chart
            estChange: estChange,
            actualChange: actualChange,
            view: self.topLevelView,
            isInflationAdjusted: isInflationAdjusted,
            showInflationToggle: enable_inflation_toggle
        });
        var bd = []
        // chartGuts holds the values of the view (e.g. fund)
        var chartGuts = this.pluck(view).getUnique();
        var all_nums = []
        var total_actual = 0
        var total_est = 0
        $.each(chartGuts, function(i, name){
            if (!incomingFilter){
                filter = {}
            }
            filter[view] = name;
            var summary = self.getSummary(view, filter, year, isInflationAdjusted);
            if (summary){
                var row = new app.BreakdownRow(summary);
                bd.push(row);
                all_nums.push(summary['actuals']);
                all_nums.push(summary['estimates']);
                total_actual = total_actual + summary['actuals']
                total_est = total_est + summary['estimates']
            }
        });

        if (debugMode == true) console.log("all breakdown numbers: " + all_nums);
        all_nums = all_nums.filter(Boolean);
        var maxNum = all_nums.sort(function(a,b){return b-a})[0];
        this.breakdownChartData = new app.BreakdownCollection(bd);
        this.breakdownChartData.maxNum = maxNum;
        if (debugMode == true) console.log("max bar chart num: " + maxNum);
        // console.log("   *** loop through breakdownChartData.forEach (x13)")
        this.breakdownChartData.forEach(function(row){
            var actuals = accounting.unformat(row.get('actuals'));
            var ests = accounting.unformat(row.get('estimates'));
            var actual_perc = BudgetHelpers.prettyPercent(actuals, total_actual);
            var est_perc = BudgetHelpers.prettyPercent(ests, total_est);
            var actual_perc_bar = parseFloat((actuals/maxNum) * 100) + '%';
            var est_perc_bar = parseFloat((ests/maxNum) * 100) + '%';
            row.set({est_perc_bar:est_perc_bar, actual_perc_bar:actual_perc_bar, est_perc:est_perc, actual_perc:actual_perc, isInflationAdjusted:isInflationAdjusted});
            var rowView = new app.BreakdownSummary({model:row});
            // add all content to the sortable table html
            $('#breakdown-table-body').append(rowView.render().el);
            // console.log("   *** in loop, initialize & render BreakdownSummary")
        });
        // console.log("   *** loop through breakdownChartData.forEach finish")

        this.mainChartView = new app.MainChartView({
            model: self.mainChartData
        });
        this.initDataTable();
        this.hideMissing();
    },
    initDataTable: function(){
        var sort_col = 3
        if (this.mainChartData.get('selectedEst')){
            sort_col = 1
        };
        this.dataTable = $("#breakdown").dataTable({
            "aaSorting": [[sort_col, "desc"]],
            "aoColumns": [
                null,
                {'sType': 'currency'},
                {'sType': 'currency'},
                {'sType': 'currency'},
                {'sType': 'currency'},
                null
            ],
            "bFilter": false,
            "bInfo": false,
            "bPaginate": false,
            "bRetrieve": true,
            "bAutoWidth": false
        });
    },
    bootstrap: function(init, year, figures){
        var self = this;
        this.spin('#main-chart', 'large');

        if (figures == 'nominal'){
            var isInflationAdjusted = false
        }
        else{
            var isInflationAdjusted = true
        }

        $('#download-button').attr('href', dataSource);
        $.when($.get(dataSource)).then(
            function(data){
                var json = $.csv.toObjects(data);
                if (debugMode == true){
                    console.log("Data source to object");
                    console.log(data);
                }
                var loadit = []
                $.each(json, function(i, j){
                    if (debugMode == true){
                        console.log("Process row");
                        console.log(j);
                    }
    
                    j['Function Slug'] = BudgetHelpers.convertToSlug(j['Function']);
                    j['Agency Slug'] = BudgetHelpers.convertToSlug(j['Agency']);
                    j['Fund Type Slug'] = BudgetHelpers.convertToSlug(j['Fund Type']);
                    j['FP Category Slug'] = BudgetHelpers.convertToSlug(j['FP Category']);
                    j['Fund Slug'] = BudgetHelpers.convertToSlug(j['Fund']);
                    j['Subfund Slug'] = BudgetHelpers.convertToSlug(j['Subfund Name']);
                    for (var key in j) {
                        if (key.match("Estimates$") || key.match("Actuals$")){
                            j[key] = BudgetHelpers.tryParse(j[key])
                        }
                    }

                    loadit.push(j)
                });
                self.reset(loadit);
                if (debugMode == true){
                    console.log("Reset loadit");
                    console.log(loadit);
                }
                self.hierarchy = {
                    "Function": ['Function', 'Agency'],
                    "Fund Type": ['Fund Type', 'Fund', 'Subfund Name'],
                    "FP Category": ['FP Category']
                }
                if (typeof init === 'undefined'){ // *** GET RID OF THIS
                    self.topLevelView = 'Function';
                    if (!year){
                        year = activeYear;
                    }
                    self.updateTables('Function', municipalityName, undefined, year, isInflationAdjusted);
                } else if (init.length == 1 ){
                    self.updateTables(init[0], municipalityName, undefined, year, isInflationAdjusted);
                } 
                else {
                    self.topLevelView = init[0];
                    var lowerView = init[0];
                    var name = init[1];
                    var filter = {}
                    var key = init[0] + ' Slug'
                    filter[key] = name;
                    var title = self.findWhere(filter).get(init[0])

                    if (init.length == 2){
                        lowerView = self.hierarchy[init[0]][1];
                    }
                    // this really only handles hierarchies w/ up to 3 levels (like Fund Type)
                    // tweak this code if there is a drilldown hierarchy w/ more than 3 levels
                    if(init.length > 2){
                        name = init[2];
                        lowerView = self.hierarchy[init[0]][2];
                        key = init[1] + ' Slug'
                        filter[key] = name;
                        //set title?
                        //title = self.findWhere(filter).get('Department');
                    }
                    self.updateTables(lowerView, title, filter, year, isInflationAdjusted);
                }
                // self.searchView = new app.SearchView();
            }
        );
    },
    spin: function(element, option){
        // option is either size of spinner or false to cancel it
        $(element).spin(option);
    },
    // Returns an array of valid years.
    getYearRange: function(){
        return Number.range(this.startYear, this.endYear + 1);
    },
    reduceTotals: function(totals){
        return totals.reduce(function(a,b){
          return a + b;
        });
    },


    // Returns a total for a given column name
    getTotals: function(values, col_name){
        var all = _.pluck(values, col_name);
        sum = this.reduceTotals(all)
        return sum;
    },
    getChartTotals: function(category, rows, year){
        var totals = [];
        $.each(rows, function(i, row){
            var col_name = BudgetHelpers.getColumnName(year, category);
            var val = row.get(col_name);
            totals.push(parseInt(val));
        });
        return totals;
    },
    // getSummary is called for each row in chart
    getSummary: function(view, query, year, isInflationAdjusted){
        if (typeof year === 'undefined'){
            year = this.activeYear;
        }
        var guts = this.where(query);
        if (guts.length < 1) {
            return null;
        }
        var summary = {};
        var self = this;

        var actual_sum = self.reduceTotals( self.getChartTotals(actualTitle, guts, year) );
        var est_sum = self.reduceTotals( self.getChartTotals(estTitle, guts, year) );
        var prev_actual_sum = self.reduceTotals( self.getChartTotals(actualTitle, guts, year - 1) );
        var prev_est_sum = self.reduceTotals( self.getChartTotals(estTitle, guts, year - 1) );

        if (isInflationAdjusted){
            actual_sum = BudgetHelpers.inflationAdjust(actual_sum, year, benchmark)
            est_sum = BudgetHelpers.inflationAdjust(est_sum, year, benchmark)
            prev_actual_sum = BudgetHelpers.inflationAdjust(prev_actual_sum, year-1, benchmark)
            prev_est_sum = BudgetHelpers.inflationAdjust(prev_est_sum, year-1, benchmark)
        }

        var actualChange = BudgetHelpers.calc_change( actual_sum, prev_actual_sum );
        var estChange = BudgetHelpers.calc_est_change( est_sum, prev_est_sum, prev_actual_sum);

        // get info for each row of the sortable chart
        $.each(guts, function(i, item){
            summary['rowName'] = item.get(view);
            summary['prevYear'] = year - 1;
            summary['prevYearRange'] = BudgetHelpers.convertYearToRange(year-1)
            summary['year'] = year;
            summary['description'] = item.get(view + ' Description');
            summary['actuals'] = actual_sum
            summary['estimates'] = est_sum
            summary['actualChange'] = actualChange;
            summary['estChange'] = estChange;
            summary['rowId'] = item.get(view + ' ID');
            summary['type'] = view
            summary['link'] = item.get('Link to Website');
            var hierarchy = self.hierarchy[self.topLevelView]
            var ranking = hierarchy.indexOf(view)
            if (ranking == 0){
                summary['child'] = hierarchy[1];
                summary['parent_type'] = null;
            } else if(ranking == 1){
                summary['child'] = hierarchy[2];
                summary['parent_type'] = hierarchy[0];
            } else if(ranking == 2) {
                summary['child'] = null;
                summary['parent_type'] = hierarchy[1];
            }
            if(summary['parent_type']){
                summary['parent'] = self.mainChartData.get('title')
            }
            summary['slug'] = item.get(view + ' Slug');
        });
        if (typeof summary['actuals'] !== 'undefined'){
            return summary
        } else {
            return null
        }
    },
    hideMissing: function(){

        sel_actual = this.mainChartData.get('selectedActual')
        sel_est = this.mainChartData.get('selectedEst')

        if(!sel_actual){
            $('.actuals').hide();
            $('#scorecard-actual').hide();
        }
        else{
            $('.actuals').show();
            $('#scorecard-actual').show();
        }
        if(!sel_est){
            $('.estimates').hide();
            $('#scorecard-est').hide();
        }
        else{
            $('.estimates').show();
            $('#scorecard-est').show();
        }

        actual_change = this.mainChartData.get('actualChange')
        est_change = this.mainChartData.get('estChange')

        if(!est_change){
            $('.main-est').hide();
        } else {
            $('.main-est').show();
        }
        if(!actual_change){
            $('.main-actual').hide();
        } else {
            $('.main-actual').show();
        }
    },
});