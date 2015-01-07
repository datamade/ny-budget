(function(){
window.formatAmount =  function(value) {
    if (value >= 1000000000)
      return "$" + value / 1000000000 + "B";
    else if (value >= 1000000)
      return "$" + value / 1000000 + "M";
    else
      return "$" + value;
  }
window.mainChartOpts = {
      chart: {
        borderColor: "#dddddd",
        borderRadius: 0,
        borderWidth: 1,
        events: {
          click: function() {
            $("#readme").fadeOut("fast");
            $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
          }
        },
        defaultSeriesType: "area",
        marginTop: 20,
        renderTo: "timeline-chart"
      },
      credits: { enabled: false },
      legend: {
        align: "right",
        verticalAlign: "top",
        x: -20,
        y: 10,
        floating: true,
        backgroundColor: "#ffffff",
        borderColor: "#cccccc"
      },
      plotOptions: {
        area: { fillOpacity: 0.25 },
        series: {
          lineWidth: 5,
          point: {
            events: {}
          },
          shadow: false
        }
      },
      title: null,
      tooltip: {
        borderColor: "#000",
        formatter: function() {
          year = parseInt(Highcharts.dateFormat("%Y", this.x))
          var next_year = (year+1)%100;
          if (next_year === 0){next_year = '00'}
          else if (next_year < 10){next_year = '0'+next_year}
          var year_range = year + '-' + next_year
          var s = "<strong>" + year_range + "</strong>";
          $.each(this.points, function(i, point) {
            s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
          });
          return s;
        },
        shared: true
      },
      xAxis: {
        gridLineColor: "#ddd",
        gridLineWidth: 1,
        type: "datetime",
        tickInterval: 365 * 24 * 36e5, // one week
        labels: {
          format: '{value:%Y}'
        }
      },
      yAxis: {
        gridLineColor: "#ddd",
        lineWidth: 1,
        labels: {
          formatter: function() { return window.formatAmount(this.value); }
        },
        title: null
      }
    }

  //displays detail sparkling using high charts (http://www.highcharts.com)
window.sparkLineOpts =  {
        chart: {
          defaultSeriesType: "area",
          marginBottom: 15,
          marginRight: 0
        },
        legend: { enabled: false },
        credits: { enabled: false },
        plotOptions: {
          area: { fillOpacity: 0.25 },
          series: {
            lineWidth: 2,
            point: {
              events: {}
            },
            shadow: false
          }
        },
        title: null,
        tooltip: {
          borderColor: "#000",
          formatter: function() {
            var s = "<strong>" + Highcharts.dateFormat("%Y", this.x) + "</strong>";
            $.each(this.points, function(i, point) {
              s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
            });
            return s;
          },
          shared: true
        },
        xAxis: {
          dateTimeLabelFormats: { year: "%Y" },
          gridLineWidth: 0,
          type: "datetime"
        },
        yAxis: {
          gridLineWidth: 0,
          labels: {
            formatter: function() { return window.formatAmount(this.value);}
          },
          lineWidth: 1,
          title: { text: null }
        }
      }

})();

