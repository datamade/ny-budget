app.BreakdownCollection = Backbone.Collection.extend({
    setRows: function(year, index){
        var self = this;
        var all_nums = []
        var total_est = 0
        var total_exp = 0
        $.each(this.models, function(i, row){
            var query = {}
            query[row.get('type')] = row.get('rowName')
            console.log("  *** call getSummary in .each this.models")
            var summ = collection.getSummary(row.get('type'), query, year)
            row.set(summ);
            row.yearIndex = index;
            all_nums.push(row.get('estimates'));
            all_nums.push(row.get('actuals'));
            total_exp = total_exp + row.get('actuals')
            total_est = total_est + row.get('estimates')
        });
        all_nums = all_nums.filter(Boolean);
        this.maxNum = all_nums.sort(function(a,b){return b-a})[0];
        $.each(this.models, function(i, row){

            var ests = row.get('estimates');
            var exps = row.get('actuals');
            if (isNaN(ests)){ests = 0};
            if (isNaN(exps)){exps = 0};

            var exp_perc = BudgetHelpers.prettyPercent(exps, total_exp);
            var est_perc = BudgetHelpers.prettyPercent(ests, total_est);

            var est_perc_bar = parseFloat((ests/self.maxNum) * 100) + '%';
            var exp_perc_bar = parseFloat((exps/self.maxNum) * 100) + '%';
            row.set({est_perc_bar:est_perc_bar, exp_perc_bar:exp_perc_bar, est_perc:est_perc, exp_perc:exp_perc});
        });
    }
});