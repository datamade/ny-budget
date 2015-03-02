app.BreakdownCollection = Backbone.Collection.extend({
    setRows: function(year, index, isInflationAdjusted){
        var self = this;
        var all_nums = []
        var total_est = 0
        var total_actual = 0
        $.each(this.models, function(i, row){
            var query = {}
            query[row.get('type')] = row.get('rowName')
            // console.log("  *** call getSummary in .each this.models")
            var summ = collection.getSummary(row.get('type'), query, year, isInflationAdjusted)
            row.set(summ);
            row.yearIndex = index;
            all_nums.push(row.get('estimates'));
            all_nums.push(row.get('actuals'));
            total_actual = total_actual + row.get('actuals')
            total_est = total_est + row.get('estimates')
        });
        all_nums = all_nums.filter(Boolean);
        this.maxNum = all_nums.sort(function(a,b){return b-a})[0];
        $.each(this.models, function(i, row){

            var ests = row.get('estimates');
            var actuals = row.get('actuals');
            if (isNaN(ests)){ests = 0};
            if (isNaN(actuals)){actuals = 0};

            var actual_perc = BudgetHelpers.prettyPercent(actuals, total_actual);
            var est_perc = BudgetHelpers.prettyPercent(ests, total_est);

            var est_perc_bar = parseFloat((ests/self.maxNum) * 100) + '%';
            var actual_perc_bar = parseFloat((actuals/self.maxNum) * 100) + '%';
            row.set({est_perc_bar:est_perc_bar, actual_perc_bar:actual_perc_bar, est_perc:est_perc, actual_perc:actual_perc});
        });
    }
});