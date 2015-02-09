var BudgetHelpers = BudgetHelpers || {};
var BudgetHelpers = {

  //converts a text in to a URL slug
  convertToSlug: function(text) {
    if (text == undefined) return '';
  	return text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g, '-');
  },
  // Given a year and category, returns the column name to search for
  getColumnName: function(year, category){
    var year_range = this.convertYearToRange(year)
    var col_name = year_range + '  ' + category;
    return col_name
  },
  convertToMoney: function(input) {
    if (isNaN(input)){
      return null
    }
    else {
      // to show decimals, return accounting.formatMoney(input)
      return accounting.formatMoney(input, '$', 0)
    }
  },
  convertYearToRange: function(year){
    // 2015 -> 2014-15
    year = year - 1
    var next_year = (parseInt(year)+1)%100;
    if (next_year === 0){next_year = '00'}
    else if (next_year < 10){next_year = '0'+next_year}
    var year_range = year + '-' + next_year
    return year_range
  },
  prettyPercent: function(num, denom){
    var percent = parseFloat((num/denom) * 100)
    if (percent > 0 && percent < 1){ var pretty = '<1%'; }
    else{ var pretty = parseInt(percent)+'%'; }
    return pretty
  },
  inflationAdjust: function(series, inflation_idx, benchmark, startYear){
    var year = startYear;
    var adjusted = [];
    $.each(series, function(i, val){
      if (isNaN(val) || val == null)
        val = null;
      else if (inflation_idx[year])
        val = parseInt(val/inflation_idx[year]*inflation_idx[benchmark]);
      adjusted.push(val);
      year = year + 1
    })
    return adjusted
  },
  unadjustedObj: function(series, startYear){
    var year = startYear;
    var values = {};
    $.each(series, function(i, val){
      if (isNaN(val))
        values[year] = null;
      else
        values[year] = parseInt(val)
      year = year + 1
    })
    return values
  },

  // Builds a cache of templates that get fetched and rendered by views
  template_cache: function(tmpl_name, tmpl_data){
      if ( !BudgetHelpers.template_cache.tmpl_cache ) {
          BudgetHelpers.template_cache.tmpl_cache = {};
      }

      if ( ! BudgetHelpers.template_cache.tmpl_cache[tmpl_name] ) {
          var tmpl_dir = '/js/templates';
          var tmpl_url = tmpl_dir + '/' + tmpl_name + '.html?4';

          var tmpl_string;
          $.ajax({
              url: tmpl_url,
              method: 'GET',
              async: false,
              success: function(data) {
                  tmpl_string = data;
              }
          });

          BudgetHelpers.template_cache.tmpl_cache[tmpl_name] = _.template(tmpl_string);
      }

      return BudgetHelpers.template_cache.tmpl_cache[tmpl_name](tmpl_data);
  },

  calc_change: function(cur, prev){
      if (prev == 0){
          return null
      }
      if (cur == 0 && prev == 0){
          return null
      }
      var change = parseFloat(((cur - prev) / prev) * 100);
      if (isNaN(change)){
        return null
      }
      if (change < 0){
          change = change.toFixed(1) + '%';
      } else {
          change = '+' + change.toFixed(1) + '%';
      }
      return change
  },
  // if year is first in estimates series, will grab the previous years exp
  calc_est_change: function(cur_app, prev_app, prev_exp){
    if (isNaN(cur_app)){
        return null
    }
    if (isNaN(prev_app)){
      var change = BudgetHelpers.calc_change(cur_app, prev_exp);
    } else{
      var change = BudgetHelpers.calc_change(cur_app, prev_app)
    }
    return change
  },
  tryParse: function(str){
      var retValue = 0;
      if(str !== null && str !== undefined) {
          if(str.length > 0) {
              str = str.replace('$', '')
              if (!isNaN(str)) {
                  retValue = parseFloat(str);
              }
          }
      }
      return retValue;
  },
}
