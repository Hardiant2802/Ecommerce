define(["jquery"], function ($) {
    "use strict";

    return {
        loadWeather: function (options) {
            var settings = $.extend(
                {
                    location: "Hanoi, VN",
                    apiKey: "66adcf70a8404bf1ba9115936262803", // key WeatherAPI
                    success: function (data) {},
                    error: function (msg) {},
                },
                options,
            );

            $.getJSON("https://api.weatherapi.com/v1/current.json", {
                key: settings.apiKey,
                q: settings.location,
                lang: "vi",
            })
                .done(function (data) {
                    var weather = {
                        city: data.location.name,
                        temp: data.current.temp_c,
                        text: data.current.condition.text,
                        icon: "https:" + data.current.condition.icon,
                    };
                    settings.success(weather);
                })
                .fail(function () {
                    settings.error("Không lấy được dữ liệu thời tiết.");
                });
        },
    };
});
