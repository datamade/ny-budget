// Breakdown Chart view. Does a lot the same kind of things as the main chart view
app.BreakdownSummary = Backbone.View.extend({
    tagName: 'tr',
    className: 'rowId',
    detailShowing: false,
    events: {
        'click .details': 'details'
    },
    initialize: function(){
        this._modelBinder = new Backbone.ModelBinder();
        var self = this;
        this.model.on('change', function(model){
            var sel = '#' + model.get('slug') + '-selected-chart';
            var actual = accounting.unformat(model.get('actuals'));
            var est = accounting.unformat(model.get('estimates'));
            if((actual + est) == 0){
                $(self.el).hide();
                if($(self.el).next().is(':visible')){
                    $(self.el).next().hide();
                }
            } else {
                $(self.el).show();
            }
        });
    },
    render: function(){
        this.$el.html(BudgetHelpers.template_cache('breakdownSummary', {model:this.model}));
        this._modelBinder.bind(this.model, this.el, {
            actuals: {selector: '[name="actuals"]', converter: this.moneyChanger},
            estimates: {selector: '[name="estimates"]', converter: this.moneyChanger},
            est_perc: {selector: '[name=est_perc]'},
            actual_perc: {selector: '[name=actual_perc]'},
            est_perc_bar: {selector: '[name=est_perc_bar]'},
            actual_perc_bar: {selector: '[name=actual_perc_bar]'}
        });
        return this;
    },
    moneyChanger: function(direction, value){
        return BudgetHelpers.convertToMoney(value);
    },
    details: function(e){
        // console.log("*** in BreakdownSummary details")
        e.preventDefault();
        if (typeof this.detailView !== 'undefined'){
            this.detailView.undelegateEvents();
        }
        if (this.$el.next().hasClass('expanded-content')){
            this.$el.next().remove();
            this.$el.find('i').attr('class', 'fa fa-caret-right fa-lg fa-fw')
        } else {
            var filter = {};
            var type = this.model.get('type');
            filter[type] = this.model.get('rowName');
            var parent_type = this.model.get('parent_type');
            if(parent_type){
                filter[parent_type] = this.model.get('parent');
            }
            var actuals = [];
            var estimates = [];
            $.each(collection.getYearRange(), function(i, year){
                var all = collection.where(filter)
                // console.log("*** in BreakdownSummary details     loop thru years")
                var actual = collection.getChartTotals(actualTitle, all, year);
                if (actual.length > 1){
                    actuals.push(collection.reduceTotals(actual));
                } else {
                    actuals.push(parseFloat(actual[0]));
                }
                var est = collection.getChartTotals(estTitle, all, year);
                if (est.length > 1){
                    estimates.push(collection.reduceTotals(est));
                } else {
                    estimates.push(parseFloat(est[0]));
                }
            });

            this.model.allActuals = actuals;
            this.model.allEstimates = estimates;
            this.detailView = new app.BreakdownDetail({model:this.model});
            this.detailView.render().$el.insertAfter(this.$el);
            this.detailView.updateChart();
            this.$el.find('i').attr('class', 'fa fa-caret-down fa-lg fa-fw')

            sel_chart_slug = "#"+this.model.get('slug') + "-selected-chart"
            if(this.model.get('estChange') == null){
                $(sel_chart_slug).parent().find('.sparkline-estimates').hide()
            }
            else{
                $(sel_chart_slug).parent().find('.sparkline-estimates').show()
            }
            if(this.model.get('actualChange') == null){
                $(sel_chart_slug).parent().find(".sparkline-actuals").hide()
            }
            else{
                $(sel_chart_slug).parent().find(".sparkline-actuals").show()
            }
        }
    }
})