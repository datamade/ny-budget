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
      return accounting.formatMoney(input)
    }
  },
  convertYearToRange: function(year){
    var next_year = (parseInt(year)+1)%100;
    if (next_year === 0){next_year = '00'}
    else if (next_year < 10){next_year = '0'+next_year}
    var year_range = year + '-' + next_year
    return year_range
  },

  // Builds a cache of templates that get fetched and rendered by views
  template_cache: function(tmpl_name, tmpl_data){
      if ( !BudgetHelpers.template_cache.tmpl_cache ) {
          BudgetHelpers.template_cache.tmpl_cache = {};
      }

      if ( ! BudgetHelpers.template_cache.tmpl_cache[tmpl_name] ) {
          var tmpl_dir = '/js/views';
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
  // if year is first in approp series, will grab the previous years exp
  calc_approp_change: function(cur_app, prev_app, prev_exp){
    if (isNaN(cur_app)){
        return null
    }
    if (isNaN(prev_app)){
        var change = parseFloat(((cur_app - prev_exp) / prev_exp) * 100);
    } else{
        var change = parseFloat(((cur_app - prev_app) / prev_app) * 100);
    }
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