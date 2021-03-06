angular.module('SunoPosCafe.posController', ['toaster', 'ion-datetime-picker', 'btford.socket-io', "cfp.hotkeys"])
  .controller('PosCtrl', ["$location", "$ionicPosition", "$ionicSideMenuDelegate", "$ionicHistory", "$timeout", "$q", "$scope", "$http", "$rootScope", "AuthFactory", "$state", "$ionicPopover", "$ionicPopup", "$ionicModal", "LSFactory", "$ionicScrollDelegate", "toaster", "printer", "$filter", "hotkeys", "Auth", "$PouchDB", PosCtrl])
  .run(function ($ionicPickerI18n) {
      $ionicPickerI18n.weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      $ionicPickerI18n.months = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
      $ionicPickerI18n.ok = "Chọn";
      $ionicPickerI18n.cancel = "Hủy";
  });

function PosCtrl($location, $ionicPosition, $ionicSideMenuDelegate, $ionicHistory, $timeout, $q, $scope, $http, $rootScope, AuthFactory, $state, $ionicPopover, $ionicPopup, $ionicModal, LSFactory, $ionicScrollDelegate, toaster, printer, $filter, hotkeys, Auth, $PouchDB) {
    // check platform
    // $scope.timerRunning = true;
    $scope.offline = null;
    $scope.isUseKeyboard = false;
    $scope.isIPad = ionic.Platform.isIPad();
    $scope.isIOS = ionic.Platform.isIOS();
    $scope.isAndroid = ionic.Platform.isAndroid();
    $scope.isWindowsPhone = ionic.Platform.isWindowsPhone();
    $scope.selectedCategory = '';
    var DBSettings = $PouchDB.DBSettings;
    var DBTables = $PouchDB.DBTables;

    if ($scope.isAndroid || $scope.isIOS || $scope.isWindowsPhone) {
        $scope.isWebView = false;
    } else
        $scope.isWebView = true;
    // $scope.isWebView = jQuery('body').hasClass('platform-browser');

    // console.log('isWebView :'+ $scope.isWebView);

    $ionicSideMenuDelegate.canDragContent(false);
    var socket;

    function audit(actionId, shortContent, embededContent) {
        var log = {
            "auditTrailModel":
              {
                  "userId": $scope.userSession.userId,
                  "featureId": 23,
                  "actionId": actionId,
                  "shortContent": shortContent,
                  "embededContent": embededContent,
                  "storeId": $scope.currentStore.storeID,
                  "companyId": $scope.userSession.companyId
              }
        }
        var url = Api.auditTrailRecord;
        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', log, function (data, status) {
            if (data) {
                // console.log(data);
            }
        }, function (error) {
            console.log(error)
        }, true, 'auditTrailRecord');
    }

    $scope.openLink = function (url) {
        if (window.cordova) {
            cordova.InAppBrowser.open(url, '_system');
        }
    }

    $scope.getSyncSetting = function () {
        var deferred = $q.defer();
        var url = Api.getKeyValue + 'isSync';
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                if (data.value != "") {
                    var rs = JSON.parse(data.value);
                }
                $scope.isSync = rs;
                console.log('isSync:', rs);
                deferred.resolve();
            }
        }, function (error) {
            console.log(error);
            deferred.reject("Có lỗi xảy ra!");
        }, true, 'isSync');
        return deferred.promise;
    }

    $scope.getCompanyInfo = function () {
        var deferred = $q.defer();
        var url = Api.getCompanyInfo;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                $scope.companyInfo = data;
                deferred.resolve();
            }
        }, function (error) {
            console.log(error);
            deferred.reject("Có lỗi xảy ra!");
        }, true, 'getCompanyInfo');
        return deferred.promise;
    }

    // Lấy mẫu in đã lưu
    $scope.getPrintTemplate = function () {
        var deferred = $q.defer();
        var url = Api.printTemplate;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                printer.initializeTemplates(data);
                deferred.resolve();
            }
        }, function (e) {
            deferred.reject("Có lỗi xảy ra!");
            printer.initializeTemplates();
            console.log(e);
        }, true, 'getPrintTemplates');
        return deferred.promise;
    }

    $scope.getProductItems = function (cid, categoryName) {
        if (categoryName && categoryName != '') {
            $scope.selectedCategory = ' thuộc nhóm ' + categoryName.toUpperCase();
        }
        else {
            $scope.selectedCategory = '';
        }
        $scope.buttonProductListStatus = 0;
        $scope.currentCategory = cid;
        var deferred = $q.defer();
        $ionicScrollDelegate.$getByHandle('productItemList').scrollTop();
        var limit = 1000;
        var pageIndex = 1;
        var url = Api.productitems + 'categoryId=' + cid + '&limit=' + limit + '&pageIndex=' + pageIndex + '&storeId=' + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                $scope.productItemList = data.items;
                deferred.resolve();
            }
        }, function (error) {
            console.log(error)
        }, true, 'getProductItems');
        return deferred.promise;
    }
    $scope.getNewProductItems = function () {
        $scope.buttonProductListStatus = 1;
        $ionicScrollDelegate.$getByHandle('productItemList').scrollTop();
        var url = Api.getNewProduct + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                $scope.productItemList = data.items;
            }
        }, function (error) {
            console.log(error)
        }, true, 'getNewProductItems');
    }
    $scope.getBestSellingProductItems = function () {
        $scope.buttonProductListStatus = 2;
        $ionicScrollDelegate.$getByHandle('productItemList').scrollTop();
        var url = Api.getBestSelling + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                $scope.productItemList = data.items;
            }
        }, function (error) {
            console.log(error)
        }, true, 'getBestSellingProductItem');
    }
    // Lấy danh sách categories
    $scope.getAllCategories = function () {
        var deferred = $q.defer();
        var url = Api.categories;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                $scope.categories = data.categories;
                $scope.categories = buildTree($scope.categories);
                deferred.resolve();
            }
        }, function (error) {
            console.log(error);
            deferred.reject("Có lỗi xảy ra!");
        }, true, 'getAllCategories');
        return deferred.promise;
    }
   
    // Tìm sản phẩm
    $scope.suglist = false;
    $scope.get_search_rs = function (key) {
        if (!key) {
            $scope.suglist = false;
            return;
        }
        var url = Api.search + key + '&storeId=' + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            $scope.searchList = data.items;
            $scope.suglist = true;
            $scope.ItemSearchIsSelected = null;
            $ionicScrollDelegate.$getByHandle('search-product-result').scrollTop();
        }, function (status) { console.log(status) }, true, 'SearchProductItem');
    }

    $scope.openCreateTablesModal = function () {
        if ($scope.popoverSettings) $scope.popoverSettings.hide();
        $ionicModal.fromTemplateUrl('create-tables.html', {
            scope: $scope,
            animation: 'slide-in-up',
            backdropClickToClose: false
        }).then(function (modal) {
            $scope.modalCreateTables = modal;
            $scope.modalCreateTables.show();
        });
    }

    $scope.createInitTableZone = function (z, q, u) {
        if (!q) {
            return toaster.pop('warning', "", 'Vui lòng nhập đủ thông tin cần thiết để tạo sơ đồ bàn.');
        }
        var t = {
            id: $scope.tableMap.length,
            zone: z ? z : '',
            quantity: q,
            unit: u ? 'Phòng' : 'Bàn',
            unit2: u,
            isUpdating: false
        }
        $scope.modalCreateTables.zone = null;
        $scope.modalCreateTables.quantity = null;
        $scope.tableMap.push(t);
        // $scope.createTable();
    }

    $scope.createTable = function () {

        if (!$scope.tablesSetting) $scope.tablesSetting = [];
        $scope.count = 1;
        var tableTAW = {
            tableUuid: uuid.v1(),
            tableId: 0,
            tableIdInZone: 0,
            tableName: 'Mang về',
            tableZone: {},
            tableStatus: 0,
            tableOrder: [{
                saleOrder: {
                    //lastSyncID: 0,
                    orderDetails: []
                }
            }],
            startTime: null
        }
        angular.copy(saleOrder, tableTAW.tableOrder[0].saleOrder);
        $scope.tables.push(tableTAW);
        if ($scope.tableMap && $scope.tableMap.length > 0) {
            for (var i = 0; i < $scope.tableMap.length; i++) {
                if ($scope.tableMap[i].hasOwnProperty('unit2')) {
                    delete $scope.tableMap[i].unit2;
                }
                if ($scope.tableMap[i].hasOwnProperty('isUpdating')) {
                    delete $scope.tableMap[i].isUpdating;
                }
                for (var j = 0; j < $scope.tableMap[i].quantity; j++) {
                    var count = j + 1;
                    var t = {
                        tableUuid: uuid.v1(),
                        tableId: $scope.count++,
                        tableIdInZone: count,
                        tableName: $scope.tableMap[i].unit + ' ' + count + ' - ' + $scope.tableMap[i].zone,
                        tableZone: $scope.tableMap[i],
                        tableStatus: 0,
                        tableOrder: [{
                            saleOrder: {
                                //lastSyncID: 0,
                                orderDetails: []
                            }
                        }],
                        startTime: null                  
                    }
                    angular.copy(saleOrder, t.tableOrder[0].saleOrder);
                    $scope.tables.push(t);
                }
            }
        }
        $scope.tablesSetting.push({
            storeId: $scope.currentStore.storeID,
            tables: $scope.tables,
            zone: $scope.tableMap
        });

        for (var x = 0; x < $scope.tablesSetting.length; x++) {
            for (var y = 0; y < $scope.tablesSetting[x].tables.length; y++) {
                for (var z = 0; z < $scope.tablesSetting[x].tables[y].tableOrder.length; z++) {
                    $scope.tablesSetting[x].tables[y].tableOrder[z].saleOrder.lastSyncID = 0;
                }
            }
        }

        var data = {
            "key": "tableSetting",
            "value": JSON.stringify($scope.tablesSetting)
        }

        var url = Api.postKeyValue;
        console.log(data.value);
        debugger;
        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
            if (data) {
                //debugger;
                ($scope.tables.length > 1) ? $scope.leftviewStatus = false : $scope.leftviewStatus = true;
                $scope.tableIsSelected = $scope.tables[0];
                $scope.orderIndexIsSelected = 0;
                $scope.modalCreateTables.hide();

                if (!$scope.isSync) {
                    $scope.updateSyncSetting(true);
                } else {
                    $scope.endSession();
                }

                toaster.pop('success', "", 'Đã lưu sơ đồ bàn thành công!');
            }
        }, function (error) {
            console.log(error)
        }, true, 'setKeyValue');
    }

    $scope.showEditTable = false;
    $scope.editTableZone = function (index) {
        console.log($scope.newTableMapTemp[index]);
        $scope.newTableMapTemp[index].isUpdating = true;
        $scope.newTableMapTemp[index].unit2 = $scope.newTableMapTemp[index].unit == 'Phòng' ? true : false;
        //$scope.showEditTable = true;
        //$scope.selectedZone = $scope.tableMap[index];
        //($scope.selectedZone.unit == 'Bàn') ? $scope.selectedZone.toogle = false: $scope.selectedZone.toogle = true;
    }

    $scope.removeTableZone = function (index) {
        $scope.tableMap.splice(index, 1);
    }

    $scope.saveChangeZone = function () {
        $scope.selectedZone.toogle ? $scope.selectedZone.unit = 'Phòng' : $scope.selectedZone.unit = 'Bàn';
        $scope.showEditTable = false;
    }

    $scope.checkInitTable = function () {
        var permissionIndex = $scope.userSession.permissions.indexOf("POSIM_Manage");
        if (permissionIndex > 0) {
            $scope.openCreateTablesModal();
        } else {
            var tableTAW = {
                tableUuid: uuid.v1(),
                tableId: 0,
                tableIdInZone: 0,
                tableName: 'Mang về',
                tableZone: {},
                tableStatus: 0,
                tableOrder: [{
                    saleOrder: {
                        //lastSyncID: 0,
                        orderDetails: []
                    }
                }],
                startTime: null
            }
            angular.copy(saleOrder, tableTAW.tableOrder[0].saleOrder);
            $scope.tables.push(tableTAW);
        }
    }

    $scope.getSettings = function () {
        var deferred = $q.defer();
        var url = Api.getMultiKeyValue;
        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', { 'keys': ['isSync', 'tableSetting', 'removeItemSetting', 'hourServiceSetting', 'BarItemSetting', 'printSetting'] }, function (data, status) {
            if (data) {
                var isSyncSetting = data.values.find(function (s) { return s.name == 'isSync' });
                if (!isSyncSetting) isSyncSetting = { value: "" };
                if (isSyncSetting) {
                    if (isSyncSetting.value != "") {
                        var ss = JSON.parse(isSyncSetting.value);
                    }
                    $scope.isSync = ss;
                    //console.log('isSync:', rs);
                }

                var tableSetting = data.values.find(function (s) { return s.name == 'tableSetting' });
                if (tableSetting) {
                    if (tableSetting.value != "") {
                        var ts = JSON.parse(tableSetting.value);
                        //console.log(rs);
                    }
                    $scope.tablesSetting = ts;
                }

                var removeItemSetting = data.values.find(function (s) { return s.name == 'removeItemSetting' });
                if (removeItemSetting) {
                    if (removeItemSetting.value) {
                        var rs = JSON.parse(removeItemSetting.value);
                    } else {
                        var rs = 2;
                    }
                    $scope.removeSetting = rs;
                    //console.log('removeItemSetting:', rs);
                }
                else {
                    $scope.removeSetting = 2;
                }

                var hourServiceSetting = data.values.find(function (s) { return s.name == 'hourServiceSetting' });
                if (!hourServiceSetting) hourServiceSetting = { value: "" };
                if (hourServiceSetting) {
                    if (hourServiceSetting.value) {
                        var hss = JSON.parse(hourServiceSetting.value);
                    } else {
                        var hss = null;
                    }
                    if (hss != null) {
                        $scope.hourService = hss;
                    } else {
                        $scope.hourService = {
                            isUse: false,
                            optionSelected: "1"
                        }
                    }

                    if ($scope.hourService && $scope.hourService.isUse) {
                        switch ($scope.hourService.optionSelected) {
                            case "1":
                                $scope.blockCounter = 15;
                                break;
                            case "2":
                                $scope.blockCounter = 30;
                                break;
                            case "3":
                                $scope.blockCounter = 60;
                                break;
                            case "0":
                                $scope.blockCounter = $scope.hourService.customOption;
                                break;
                        }
                    }
                    //console.log('hourServiceSetting:', rs);
                }

                var BarItemSetting = data.values.find(function (s) { return s.name == 'BarItemSetting' });
                if (!BarItemSetting) BarItemSetting = { value: "" };
                if (BarItemSetting) {
                    if (BarItemSetting.value) {
                        $scope.BarItemSetting = JSON.parse(BarItemSetting.value);
                    } else {
                        $scope.BarItemSetting = null;
                    }
                    //console.log('BarItemSetting:', data);
                }

                var printSetting = data.values.find(function (s) { return s.name == 'printSetting' });
                if (printSetting) {
                    if (printSetting.value != "") {
                        var ps = JSON.parse(printSetting.value);
                        $scope.printSetting = ps;
                    } //else {
                    //    $scope.printSetting = {
                    //        'printSubmitOrder': false,
                    //        'printNoticeKitchen': false,
                    //        'prePrint': false,
                    //        'unGroupItem': false,
                    //        'noticeByStamps': false
                    //    };
                    //}
                    //console.log('printSetting:', rs);
                }
                else {
                    $scope.printSetting = {
                        'printSubmitOrder': false,
                        'printNoticeKitchen': false,
                        'prePrint': false,
                        'unGroupItem': false,
                        'noticeByStamps': false
                    };
                }
                deferred.resolve(data);
            }
        }, function (error) {
            console.log(error);
            deferred.reject("Đã xảy ra lỗi");
        }, true, 'getSettings');

        return deferred.promise;
    }

    $q.when(Promise.all([Auth.getToken(), Auth.getUser(), Auth.getSetting(), Auth.getStoreList(), DBSettings.$getDocByID({ _id: 'currentStore' }), Auth.getBootloader(), Auth.getSessionId()]))
    .then(function (data) {
        if (data[0].docs.length > 0 && data[1].docs.length > 0 && data[2].docs.length > 0 && data[3].docs.length > 0) {
            $scope.token = data[0].docs[0].token;
            $scope.userSession = data[1].docs[0].user;
            $scope.settings = data[2].docs[0].setting;
            $scope.storesList = data[3].docs[0].store;
            $scope.authBootloader = data[5].docs[0].bootloader;
            $scope.clientId = data[6].docs[0].session;
            $scope.saleList = $scope.authBootloader.users.userProfiles;
            if (data[4].docs.length > 0) {
                var localCurrentStore = data[4].docs[0].currentStore;
                var storeIndex = findIndex($scope.storesList, 'storeID', localCurrentStore.storeID);
                if (storeIndex != null) {
                    $scope.currentStore = data[4].docs[0].currentStore;
                }
                else {
                    $scope.currentStore = $scope.storesList[0];
                    DBSettings.$addDoc({ _id: 'currentStore', currentStore: angular.copy($scope.currentStore), _rev: data[4].docs[0]._rev });
                }
            }
            else {
                $scope.currentStore = $scope.storesList[0];
                DBSettings.$addDoc({ _id: 'currentStore', currentStore: angular.copy($scope.currentStore) });
            }

            $scope.isMultiplePrice = $scope.settings.saleSetting.applyCustomerPricingPolicy;

            $scope.showCategories = true;

            $scope.permissionIndex = $scope.userSession.permissions.indexOf("POSIM_Manage");
            $scope.userInfo = {};
            angular.copy($scope.userSession, $scope.userInfo);
            delete $scope.userInfo.permissions;
        } else {
            $state.go('login', {}, {
                reload: true
            });
        }


        //"selectedItem.unitPrice",
        //"selectedItem.discountIsPercent",
        //"selectedItem.discount",
        //"selectedItem.discountInPercent",
        // 5 -"tableIsSelected.tableOrder",
        // 6 -"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.IsDiscountPercent",
        // 7 -"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.DiscountInPercent",
        // 8 -"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.discount",
        // 9 -"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].quantity",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].newOrderCount",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].discount",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.customer",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.subFee",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.SubFeeInPercent",
        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.IsSubFeePercent"
        $scope.$watchGroup(watchExpressions, function (newValue, oldValue) {
            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {

                repricingOrder($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder, $scope.isMultiplePrice);
            }

            // Tính toán số tiền giảm giá mỗi khi thay đổi phương thức giảm giá cho item trong đơn hàng
            if ($scope.selectedItem) {
                // console.log($scope.selectedItem.discount,$scope.selectedItem.discountIsPercent,$scope.selectedItem.discountInPercent);
                if ($scope.selectedItem.discountIsPercent) {
                    if ($scope.selectedItem.discountInPercent > 100) $scope.selectedItem.discountInPercent = 100;
                    $scope.selectedItem.discount = ($scope.selectedItem.unitPrice * $scope.selectedItem.discountInPercent) / 100;
                }
            }
            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.IsSubFeePercent) {
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent = 0;
                if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent > 100) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent = 100;
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subFee = ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent * $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subTotal) / 100;

            }
            if ($scope.selectedItem && !$scope.selectedItem.discountIsPercent) {
                if ($scope.selectedItem.discount > $scope.selectedItem.unitPrice) $scope.selectedItem.discount = $scope.selectedItem.unitPrice;
            }
            // Tính giá bán cuối sau khi trừ giảm giá
            if ($scope.selectedItem && $scope.selectedItem.discount > 0) {
                $scope.selectedItem.sellPrice = $scope.selectedItem.unitPrice - $scope.selectedItem.discount;
            }
            if ($scope.selectedItem && $scope.selectedItem.discount == 0) $scope.selectedItem.sellPrice = $scope.selectedItem.unitPrice;


            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.IsDiscountPercent) {
                if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.DiscountInPercent > 100) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.DiscountInPercent = 100;
            }



            // Tính toán lại đơn hàng hiện tại, bổ sung thông tin thu ngân, người bán hàng vào đơn hàng.
            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
                calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total;
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.cashier = $scope.userSession.userId;
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleUser) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleUser = $scope.userInfo;
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.tableName) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.tableName = $scope.tableIsSelected.tableName;
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy) {
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy = $scope.userSession.userId;
                    var saleUserIndex = findIndex($scope.authBootloader.users.userProfiles, 'userId', $scope.userSession.userId);
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdByName = $scope.authBootloader.users.userProfiles[saleUserIndex].displayName;
                }
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleOrderUuid) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleOrderUuid = uuid.v1();
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.storeId) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.storeId = $scope.currentStore.storeID;
            }

            if ($scope.tables && $scope.tables.length > 0 && $scope.currentStore.storeID) {
                //console.log('fired');
                //Mỗi khi có thay đổi trên hóa đơn thì cập nhật lại bàn đó dưới DB Local
                updateTableToDB();
                ////LSFactory.set($scope.currentStore.storeID, {
                ////    tables: $scope.tables,
                ////    zone: $scope.tableMap
                ////});
            }
        });

        //"tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails"
        $scope.$watchCollection("tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails", function (newValue, oldValue) {
            //console.log(newValue);
            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {
                calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total;
            }

            if ($scope.tables && $scope.tables.length > 0 && $scope.currentStore.storeID) {
                //Mỗi khi có thay đổi trên hóa đơn thì cập nhật lại bàn đó dưới DB Local
                //console.log('fired');
                updateTableToDB();
                ////console.log('watch Collection');
                ////console.log('collection', newValue);
                ////console.log('collection', oldValue);
                //console.log('tableIsSelected', $scope.tableIsSelected);
                //var array = prepareTables();
                //Promise.all([
                //    DBTables.$queryDoc({
                //        selector: {
                //            'store': { $eq: $scope.currentStore.storeID }
                //        },
                //        //fields: ['_id', '_rev']
                //    }),
                //    DBSettings.$getDocByID({ _id: 'zones' })
                //])
                //.then(function (data) {
                //    //console.log(data[0]);
                //    //console.log(data[1]);
                //    //if (data[0].docs.length > 0) {
                //    //    for (var x = 0; x < data[0].docs.length; x++) {
                //    //        var item = array.filter(function (i) { return i._id == data[0].docs[x]._id; });
                //    //    }
                //    //}
                //    //else {
                //    //}
                //        if (data[1].docs.length > 0) {
                //            return DBSettings.$addDoc({ _id: 'zones', zones: angular.copy($scope.tableMap), _rev: data[1].docs[0]._rev });
                //        }
                //        else {
                //            return DBSettings.$addDoc({ _id: 'zones', zones: angular.copy($scope.tableMap) });
                //        }
                //})
                //.catch(function (error) {
                //    //console.log('collectionError', error);
                //    //try to override zones again.
                //    return DBSettings.$getDocByID({ _id: 'zones' });
                //})
                //.then(function (data) {
                //    if (data.docs) {
                //        if (data.docs.length > 0) {
                //            return DBSettings.$addDoc({ _id: 'zones', zones: angular.copy($scope.tableMap), _rev: data.docs[0]._rev });
                //        }
                //        else {
                //            return DBSettings.$addDoc({ _id: 'zones', zones: angular.copy($scope.tableMap) });
                //        }
                //    }
                //})
                //.catch(function (error) {
                //    console.log('collectionError2', error);
                //});
                ////LSFactory.set($scope.currentStore.storeID, {
                ////    tables: $scope.tables,
                ////    zone: $scope.tableMap
                ////});
            }
        });

        $scope.$watch("offline", function (n) {
            if (n)
                if (n.action == "submit-order")
                    toaster.pop('error', "", 'Kết nối internet không ổn định hoặc đã mất kết nối internet, vui lòng lưu đơn hàng sau khi có internet trở lại!');
                else
                    toaster.pop('error', "", 'Kết nối internet không ổn định hoặc đã mất kết nối internet, thao tác hiện không thể thực hiện được, vui lòng thử lại sau!');
            $scope.offline = null;
        });

        $scope.$watchCollection("receiptVoucher", function (n) {
            if ($scope.tableIsSelected && $scope.receiptVoucher.length > 0) {
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.receiptVoucher = $scope.receiptVoucher;
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].balance = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total - $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount;
            }
        });

        $scope.$watch("receiptVoucher[0].amount", function (n) {
            if ($scope.tableIsSelected && $scope.receiptVoucher.length > 0 && $scope.receiptVoucher[0].amount > ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total - $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.amountPaid)) {
                $scope.receiptVoucher[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total - $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.amountPaid;
            }
        });

        // Bắt đầu load dữ liệu
        return Promise.all([$scope.getAllCategories(), $scope.getProductItems(''), $scope.getPrintTemplate, $scope.getCompanyInfo(), $scope.getSettings(), { localCurrentStore: localCurrentStore }])
    })
    .then(function (loadedData) {
        $scope.tables = [];
        $scope.tableMap = [];
        //Thêm mảng tạm để phục hồi khi cần.
        $scope.tableMapTemp = [];
        $scope.tablesTemp = [];
        var tableSetting = $scope.tablesSetting;
        return Promise.all([
            DBTables.$queryDoc({
                selector: {
                    'store': { $eq: $scope.currentStore.storeID },
                    'tableId': { $gte: null }
                },
                sort: [{ tableId: 'asc' }]
                //fields: ['_id', 'table']
            }),
            DBSettings.$getDocByID({ _id: 'zones_' + $scope.userSession.companyId + '_' + $scope.currentStore.storeID }),
            loadedData[5],
        ]);
    })
    .then(function (data) {
        //Kiểm tra trong DB Local đã có có sơ đồ phòng bàn chưa.
        //- Nếu có thì đọc lên vì trong sơ đồ phòng bàn ở DB Local có thông tin bàn đang dùng và trống.
        //- Nếu chưa có => POS Cafe mới chạy lần đầu cần thực hiện lưu thông tin sơ đồ phòng bàn vào DB Local hoặc mở Modal khởi tạo phòng bàn.
        if (data[0].docs.length > 0 && data[1].docs[0] && data[1].docs[0].zones.length > 0) {
            var pDBTable = data[0].docs;
            var pDBZone = data[1].docs[0].zones;
            $scope.tables = pDBTable;
            $scope.tableMap = pDBZone;
            $scope.tablesTemp = angular.copy(pDBTable);
            $scope.tableMapTemp = angular.copy(data[2].localCurrentStore.zone);
            if (!$scope.tablesSetting) $scope.tablesSetting = [];
        } else if ($scope.tablesSetting) {
            var storeIndex = findIndex($scope.tablesSetting, 'storeId', $scope.currentStore.storeID);
            if (storeIndex != null) {
                $scope.tables = $scope.tablesSetting[storeIndex].tables;
                $scope.tableMap = $scope.tablesSetting[storeIndex].zone;
                $scope.tablesTemp = angular.copy($scope.tablesSetting[storeIndex].tables);
                $scope.tableMapTemp = angular.copy($scope.tablesSetting[storeIndex].zone);
                //Lưu xuống DB Local
                var array = prepareTables();
                Promise.all([
                    DBTables.$manipulateBatchDoc(array),
                    DBSettings.$addDoc({ _id: 'zones_' + $scope.userSession.companyId + '_' + $scope.currentStore.storeID, zones: angular.copy($scope.tableMap) })
                ])
                .then(function (data) {
                    //console.log('Lưu DB', data);
                    //Handle exceptions
                });
            } else {
                $scope.checkInitTable();
            }
        } else {
            $scope.checkInitTable();
        }
        $scope.tableIsSelected = $scope.tables[0];
        $scope.orderIndexIsSelected = 0;
        ($scope.tables.length > 1) ? $scope.leftviewStatus = false : $scope.leftviewStatus = true;
        //$scope.getSyncSetting().then(function () {
        if ($scope.isSync) {

            socket = io.connect(socketUrl, { query: 'room=' + $scope.userSession.companyId + '_' + $scope.currentStore.storeID });
            // socket.heartbeatTimeout = 2000; 
            socket.on('broadcastOrders', function (msg) {
                console.log('initShift', msg);
                if (msg.storeId == $scope.currentStore.storeID) {
                    // console.log('-- Đã nhận tín hiệu từ socket --');
                    // console.log(msg.tables);

                    DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                    .then(function (data) {
                        $scope.shiftId = null;
                        if (data.docs.length > 0) {
                            $scope.shiftId = data.docs[0].shiftId;
                        }
                        if ($scope.shiftId != msg.shiftId) {
                            $scope.shiftId = msg.shiftId;
                            return DBSettings.$addDoc({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID, shiftId: msg.shiftId });
                            //.catch(function (error) { console.log(error); });
                            //LSFactory.set('shiftId', msg.shiftId);
                        }
                        return null;
                        //Đoạn này phải chạy tuần tự vì có trường hợp lỗi giữa add shiftId và removeId gây reload nhiều lần.
                    })
                    .then(function (data) {
                        debugger;
                        $scope.unNoticeTable = filterHasNoticeOrder($scope.tables);
                        // angular.copy($scope.tables,$scope.copyTables);
                        // var filterHasNoticeOrder($scope.copyTables);

                        //Cập nhật lại sơ đồ bàn mới từ Server.
                        $scope.tables = msg.tables;

                        if (msg.tables && $scope.tables.length > 0) socketAction.process($scope.tables, $scope.unNoticeTable);
                        // console.log(msg);
                        if ($scope.tables) {
                            //Sửa lỗi server trả về tableStatus bị sai.
                            for (var i = 0; i < $scope.tables.length; i++) {
                                var tableStatus = tableIsActive($scope.tables[i]);
                                if (tableStatus == true) {
                                    $scope.tables[i].tableStatus = 1;
                                }
                            }
                            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {
                                var tableIndex = findIndex($scope.tables, 'tableUuid', $scope.tableIsSelected.tableUuid);
                                $scope.tableIsSelected = $scope.tables[tableIndex];
                            }
                            $scope.$apply();
                        }
                        
                        if (!$scope.tables) {
                            Promise.all([
                                DBSettings.$removeDoc({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID }),
                                DBTables.$queryDoc({
                                    selector: {
                                        'store': { $eq: $scope.currentStore.storeID }
                                        //'tableId': { $gte: null }
                                    },
                                    //sort: [{ tableId: 'asc' }]
                                })
                            ])
                            .then(function (data) {
                                console.log(data);
                                data[1].docs.forEach(function (d) { d._deleted = true; });
                                return DBTables.$manipulateBatchDoc(data[1].docs);
                            })
                            .then(function (data) {
                                window.location.reload(true);
                            })
                            .catch(function (error) {
                                console.log(error);
                            })
                            //window.localStorage.removeItem('shiftId');
                            //window.localStorage.removeItem($scope.currentStore.storeID);
                            //window.location.reload(true);
                        }
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
                    //$scope.shiftId = LSFactory.get('shiftId');

                }
                // console.log($scope.tables);
            });

            var syncOrder = function (msg) {
                debugger;
                console.log(msg);
                if (msg.storeId == $scope.currentStore.storeID) {
                    for (var x = 0; x < $scope.tables.length; x++) {
                        var t = $scope.tables[x];
                        if (t.tableUuid == msg.tables[0].tableUuid) {
                            $scope.tables[x] = msg.tables[0];
                            if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {
                                var tableIndex = findIndex($scope.tables, 'tableUuid', $scope.tableIsSelected.tableUuid);
                                $scope.tableIsSelected = $scope.tables[tableIndex];
                            }
                            DBTables.$queryDoc({
                                selector: {
                                    'store': { $eq: $scope.currentStore.storeID },
                                    'tableUuid': { $eq: msg.tables[0].tableUuid }
                                },
                                fields: ['_id', '_rev']
                            })
                            .then(function (data) {
                                //console.log(data);
                                var table = JSON.parse(JSON.stringify(msg.tables[0]));
                                table._id = data.docs[0]._id;
                                table._rev = data.docs[0]._rev;
                                table.store = $scope.currentStore.storeID;
                                return DBTables.$addDoc(table);
                            })
                            .then(function (data) {
                                //console.log(data);
                            })
                            .catch(function (error) {
                                console.log(error);
                            })
                        }
                    }
                    $scope.$apply();
                }
            };

            socket.on('updateOrder', syncOrder);

            socket.on('completeOrder', syncOrder);

            socket.on('printHelper', function (msg) {
                if (msg.storeId == $scope.currentStore.storeID) {
                    // console.log('-- Đã nhận tín hiệu in hộ --');
                    if ($scope.isWebView && ($scope.printHelper && $scope.printHelper.cashier && msg.orderType == 'cashier') || ($scope.printHelper && $scope.printHelper.kitchen && msg.orderType == 'kitchen'))
                        // console.log(msg.orderType);
                        if (msg.orderType == 'kitchen') {
                            printOrderInBrowser(printer, msg.printOrder, 128, msg.printSetting);
                        } else if (msg.orderType == 'cashier') {
                            printOrderInBrowser(printer, msg.printOrder, 1, msg.printSetting);
                        }
                }
            });

            socket.on('exception', function (msg) {
                // console.log(msg);
                // console.log($scope.currentStore.storeID,msg.data.storeId);
                //debugger;
                if (msg.data.storeId == $scope.currentStore.storeID) {
                    if (msg.errorCode && msg.errorCode == 'invalidShift') {
                        DBSettings.$removeDoc({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                        .then(function (data) {
                            window.location.reload(true);
                        })
                        .catch(function (error) {
                            console.log(error);
                        });
                        //window.localStorage.removeItem('shiftId');
                        window.location.reload(true);
                    }

                    if (msg.errorCode && msg.errorCode == 'invalidStore') {
                        $scope.logout();
                    }

                    if (msg.errorCode && msg.errorCode == 'unauthorizedClientId') {
                        $scope.logout();
                    }
                }
            });
            var ownerOrder = filterOwnerOrder($scope.tables, $scope.userSession.userId);
            data = angular.copy(ownerOrder);
            ownerOrder = filterInitOrder(data);

            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
            .then(function (data) {
                //debugger;
                var shiftId = null;
                if (data.docs.length > 0) {
                    shiftId = data.docs[0].shiftId;
                }
                debugger;
                var initData = {
                    "companyId": $scope.userSession.companyId,
                    "storeId": $scope.currentStore.storeID,
                    "clientId": $scope.clientId,
                    "shiftId": shiftId, //LSFactory.get('shiftId'),
                    "startDate": "",
                    "finishDate": "",
                    "tables": ownerOrder,
                    "zone": $scope.tableMap
                };
                initData = angular.toJson(initData);
                initData = JSON.parse(initData);
                console.log('initData', initData);
                socket.emit('initShift', initData);
            })
            .catch(function(error){
                console.log(error);
            })

            
            // console.log('gọi init: ' + LSFactory.get('shiftId') );
        }
        //// Nếu truy cập bằng máy tính thì kiểm tra thiết lập in hộ
        //if ($scope.isWebView && window.localStorage.getItem('printHelper')) $scope.printHelper = JSON.parse(window.localStorage.getItem('printHelper'));
        //// Nếu truy cập bằng phiên bản app cho android hoặc ios thì load thông tin máy in
        //if ($scope.isIPad || $scope.isIOS || $scope.isAndroid) {
        //    if (window.localStorage.getItem('printDevice'))
        //        $scope.printDevice = JSON.parse(window.localStorage.getItem('printDevice'));
        //}
        return Promise.all([DBSettings.$getDocByID('printHelper'), DBSettings.$getDocByID('printDevice')]);
        //});
    })
    .then(function (data) {
        if ($scope.isWebView && data[0].docs.length > 0)
            $scope.printHelper = data[0].docs[0].printHelper;
        if (($scope.isIPad || $scope.isIOS || $scope.isAndroid) && data[1].docs.length > 0) {
            //if (data[1].docs.length > 0) 
            $scope.printDevice = JSON.parse(data[1].docs[0].printDevice);
        }
    })
    .catch(function (error) {
        console.log(error);
        $state.go('login');
    });

    var prepareTables = function () {
        var tables = angular.copy($scope.tables);
        var array = [];
        tables.forEach(function (t) {
            var table = JSON.parse(JSON.stringify(t));
            table._id = t.tableId.toString() + "_" + $scope.userSession.companyId + '_' + $scope.currentStore.storeID;
            table.store = $scope.currentStore.storeID;
            array.push(table);
        });
        return array;
    }

    var watchExpressions = [
      "selectedItem.unitPrice",
      "selectedItem.discountIsPercent",
      "selectedItem.discount",
      "selectedItem.discountInPercent",
      "tableIsSelected.tableOrder",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.IsDiscountPercent",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.DiscountInPercent",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.discount",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].quantity",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].newOrderCount",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].discount",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.customer",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.subFee",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.SubFeeInPercent",
      "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.IsSubFeePercent"
    ];


    //$scope.getAllCategories().then(function () {
    //    $scope.getProductItems('').then(function () {
    //        $scope.getPrintTemplate().then(function () {
    //            $scope.getRemoveItemSetting().then(function () {
    //                $scope.getPrintSetting().then(function () {
    //                    $scope.getCompanyInfo().then(function () {
    //                        $scope.getBlockTimeSetting().then(function () {
    //                            $scope.getTableSetting().then(function () {
    //                                $scope.getBarItemSetting().then(function () {
    //                                    $scope.tables = [];
    //                                    $scope.tableMap = [];
    //                                    //Thêm mảng tạm để phục hồi khi cần.
    //                                    $scope.tableMapTemp = [];
    //                                    $scope.tablesTemp = [];
    //                                    var tableSetting = $scope.tablesSetting;
    //                                    var localStorage = LSFactory.get($scope.currentStore.storeID);
    //                                    if (localStorage) {
    //                                        $scope.tables = localStorage.tables;
    //                                        $scope.tableMap = localStorage.zone;
    //                                        $scope.tablesTemp = angular.copy(localStorage.tables);
    //                                        $scope.tableMapTemp = angular.copy(localCurrentStore.zone);
    //                                        if (!tableSetting) $scope.tablesSetting = [];
    //                                    } else if (tableSetting) {
    //                                        var storeIndex = findIndex($scope.tablesSetting, 'storeId', $scope.currentStore.storeID);
    //                                        if (storeIndex != null) {
    //                                            $scope.tables = $scope.tablesSetting[storeIndex].tables;
    //                                            $scope.tableMap = $scope.tablesSetting[storeIndex].zone;
    //                                            $scope.tablesTemp = angular.copy($scope.tablesSetting[storeIndex].tables);
    //                                            $scope.tableMapTemp = angular.copy($scope.tablesSetting[storeIndex].zone);
    //                                        } else {
    //                                            $scope.checkInitTable();
    //                                        }
    //                                    } else {
    //                                        $scope.checkInitTable();
    //                                    }
    //                                    $scope.tableIsSelected = $scope.tables[0];
    //                                    $scope.orderIndexIsSelected = 0;
    //                                    ($scope.tables.length > 1) ? $scope.leftviewStatus = false : $scope.leftviewStatus = true;

    //                                    $scope.getSyncSetting().then(function () {

    //                                        if ($scope.isSync) {

    //                                            socket = io.connect(socketUrl, { query: 'room=' + $scope.userSession.companyId + '_' + $scope.currentStore.storeID });
    //                                            // socket.heartbeatTimeout = 2000; 
    //                                            socket.on('broadcastOrders', function (msg) {

    //                                                // console.log(msg.storeId);
    //                                                if (msg.storeId == $scope.currentStore.storeID) {
    //                                                    // console.log('-- Đã nhận tín hiệu từ socket --');
    //                                                    // console.log(msg.tables);
    //                                                    $scope.shiftId = LSFactory.get('shiftId');

    //                                                    if ($scope.shiftId != msg.shiftId) {
    //                                                        $scope.shiftId = msg.shiftId;
    //                                                        LSFactory.set('shiftId', msg.shiftId);
    //                                                    }

    //                                                    $scope.unNoticeTable = filterHasNoticeOrder($scope.tables);
    //                                                    // angular.copy($scope.tables,$scope.copyTables);
    //                                                    // var filterHasNoticeOrder($scope.copyTables);

    //                                                    $scope.tables = msg.tables;

    //                                                    if (msg.tables && $scope.tables.length > 0) socketAction.process($scope.tables, $scope.unNoticeTable);
    //                                                    // console.log(msg);
    //                                                    if ($scope.tables) {
    //                                                        for (var i = 0; i < $scope.tables.length; i++) {
    //                                                            var tableStatus = tableIsActive($scope.tables[i]);
    //                                                            if (tableStatus == true) {
    //                                                                $scope.tables[i].tableStatus = 1;
    //                                                            }
    //                                                        }
    //                                                        if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {
    //                                                            var tableIndex = findIndex($scope.tables, 'tableUuid', $scope.tableIsSelected.tableUuid);
    //                                                            $scope.tableIsSelected = $scope.tables[tableIndex];
    //                                                        }
    //                                                        $scope.$apply();
    //                                                    }

    //                                                    if (!$scope.tables) {
    //                                                        window.localStorage.removeItem('shiftId');
    //                                                        window.localStorage.removeItem($scope.currentStore.storeID);
    //                                                        window.location.reload(true);
    //                                                    }
    //                                                }
    //                                                // console.log($scope.tables);
    //                                            });

    //                                            socket.on('printHelper', function (msg) {
    //                                                if (msg.storeId == $scope.currentStore.storeID) {
    //                                                    // console.log('-- Đã nhận tín hiệu in hộ --');
    //                                                    if ($scope.isWebView && ($scope.printHelper && $scope.printHelper.cashier && msg.orderType == 'cashier') || ($scope.printHelper && $scope.printHelper.kitchen && msg.orderType == 'kitchen'))
    //                                                        // console.log(msg.orderType);
    //                                                        if (msg.orderType == 'kitchen') {
    //                                                            printOrderInBrowser(printer, msg.printOrder, 128, msg.printSetting);
    //                                                        } else if (msg.orderType == 'cashier') {
    //                                                            printOrderInBrowser(printer, msg.printOrder, 1, msg.printSetting);
    //                                                        }
    //                                                }
    //                                            });

    //                                            socket.on('exception', function (msg) {
    //                                                // console.log(msg);
    //                                                // console.log($scope.currentStore.storeID,msg.data.storeId);
    //                                                if (msg.data.storeId == $scope.currentStore.storeID) {
    //                                                    if (msg.errorCode && msg.errorCode == 'invalidShift') {
    //                                                        window.localStorage.removeItem('shiftId');
    //                                                        window.location.reload(true);
    //                                                    }

    //                                                    if (msg.errorCode && msg.errorCode == 'invalidStore') {
    //                                                        $scope.logout();
    //                                                    }

    //                                                    if (msg.errorCode && msg.errorCode == 'unauthorizedClientId') {
    //                                                        $scope.logout();
    //                                                    }
    //                                                }
    //                                            });

    //                                            var ownerOrder = filterOwnerOrder($scope.tables, $scope.userSession.userId);
    //                                            data = angular.copy(ownerOrder);
    //                                            ownerOrder = filterInitOrder(data);

    //                                            var initData = {
    //                                                "companyId": $scope.userSession.companyId,
    //                                                "storeId": $scope.currentStore.storeID,
    //                                                "clientId": $scope.clientId,
    //                                                "shiftId": LSFactory.get('shiftId'),
    //                                                "startDate": "",
    //                                                "finishDate": "",
    //                                                "tables": ownerOrder,
    //                                                "zone": $scope.tableMap
    //                                            }

    //                                            initData = angular.toJson(initData);
    //                                            initData = JSON.parse(initData);
    //                                            socket.emit('initShift', initData);
    //                                            // console.log('gọi init: ' + LSFactory.get('shiftId') );
    //                                        }
    //                                        // Nếu truy cập bằng máy tính thì kiểm tra thiết lập in hộ
    //                                        if ($scope.isWebView && window.localStorage.getItem('printHelper')) $scope.printHelper = JSON.parse(window.localStorage.getItem('printHelper'));
    //                                        // Nếu truy cập bằng phiên bản app cho android hoặc ios thì load thông tin máy in
    //                                        if ($scope.isIPad || $scope.isIOS || $scope.isAndroid) {
    //                                            if (window.localStorage.getItem('printDevice'))
    //                                                $scope.printDevice = JSON.parse(window.localStorage.getItem('printDevice'));
    //                                        }
    //                                    });

    //                                }, function () {
    //                                    $state.go('login');
    //                                });
    //                            });
    //                        });
    //                    });
    //                });
    //            });
    //        });
    //    });
    //});

    $ionicPopover.fromTemplateUrl('store-list.html', {
        scope: $scope
    }).then(function (popover) {
        $scope.popoverStoreList = popover;
    });

    $scope.openPopOverStoreList = function (e) {
        $scope.popoverStoreList.show(e);
    }

    $scope.changeCurrentStore = function (s) {
        //window.localStorage.setItem('currentStore', JSON.stringify(s));
        DBSettings.$getDocByID({ _id: 'currentStore' })
        .then(function (data) {
            if (data.docs.length > 0) {
                return DBSettings.$addDoc({ _id: data.docs[0]._id, _rev: data.docs[0]._rev, currentStore: s });
            }
            else {
                return DBSettings.$addDoc({ _id: 'currentStore', currentStore: s });
            }
        })
        .then(function (data) {
            //console.log(data);
            //log for debugging;
        })
        .catch(function (error) {
            console.log(error);
        })
        window.location.reload(true);
    }

    $ionicPopover.fromTemplateUrl('settings.html', {
        scope: $scope
    }).then(function (popover) {
        $scope.popoverSettings = popover;
    });

    $scope.openPopoverSettings = function (e) {
        $scope.popoverSettings.show(e);
    }

    $scope.calcolor = function (i) {
        return i % 5;
    }

    $scope.switchLayout = function () {
        $scope.leftviewStatus = !$scope.leftviewStatus;
    }

    $scope.showList = function () {
        $scope.showCategories = !$scope.showCategories;
    }

    $scope.buttonStatus = null;
    $scope.filterTables = function (k, z) {
        $ionicScrollDelegate.$getByHandle('tables').scrollTop();
        switch (k) {
            case 'status':
                $scope.buttonStatus = z;
                $scope.currentZone = {
                    tableStatus: z
                };
                $scope.leftviewStatus = false;
                break;
            case 'zone':
                // console.log(z);
                var filterObject = {
                    id: z.id,
                    quantity: z.quantity,
                    unit: z.unit,
                    zone: z.zone
                }
                $scope.buttonStatus = z;
                $scope.currentZone = {
                    tableZone: filterObject
                };
                break;

            default:
                $scope.buttonStatus = null;
                $scope.currentZone = {};
        }
    }

    $scope.openTable = function (t) {
        $scope.tableIsSelected = t;
        $scope.pinItem = null;
        if ($scope.tableIsSelected.tableOrder.length == 0) {
            $scope.tableIsSelected.tableOrder = [{
                saleOrder: {}
            }]
            angular.copy(saleOrder, $scope.tableIsSelected.tableOrder[0].saleOrder)
        };

        $scope.orderIndexIsSelected = 0;
        $scope.showOption = false;
        $scope.buttonStatus = null;
        $scope.switchLayout();
        $ionicScrollDelegate.$getByHandle('orders-details').scrollBottom();
    }

    $scope.openTableTakeAway = function () {
        $scope.tableIsSelected = $scope.tables[0];
        $scope.orderIndexIsSelected = 0;

        if ($scope.tableIsSelected.tableOrder.length == 0) {
            $scope.tableIsSelected.tableOrder = [{
                saleOrder: {
                }
            }];
            angular.copy(saleOrder, $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
        }
        $scope.switchLayout();
    }

    $scope.changeOrder = function (index) {
        if ($scope.orderIndexIsSelected == index) {
            if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.printed && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.printed.length > 0) {
                $scope.openModalPrintedList();
            }
        } else {
            $scope.orderIndexIsSelected = index;
            $scope.pinItem = null;
            $ionicScrollDelegate.$getByHandle('orders-details').scrollBottom();
        }
    }

    $ionicPopover.fromTemplateUrl('table-action.html', {
        scope: $scope
    }).then(function (popover) {
        $scope.popoverTableAction = popover;
    });

    $scope.tableAction = function (e) {
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
            $scope.popoverTableAction.show(e);
        }
    }

    // Doi ban  
    $scope.openModalSwitchTable = function () {
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != $scope.userSession.userId && $scope.permissionIndex == -1) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        }
        $scope.popoverTableAction.hide();
        $ionicModal.fromTemplateUrl('switch-tables.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modalSwitchTable = modal;
            $scope.modalSwitchTable.show();
        });
    }

    $scope.closeModalSwitchTable = function () {
        $scope.modalSwitchTable.hide();
    }

    $scope.changeTable = function (t) {

        // lưu data bàn trước khi đổi
        var newtable = {};
        angular.copy(t, newtable);
        var oldtable = {};
        angular.copy($scope.tableIsSelected, oldtable);
        var oldOrderId = oldtable.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleOrderUuid;

        // Kiểm tra nếu bàn mới chưa có order nào thì khởi tạo dữ liệu
        if (t.tableOrder.length == 0) {
            t.tableOrder = [{
                saleOrder: {}
            }];
            angular.copy(saleOrder, t.tableOrder[0].saleOrder);
        }

        // chuyển dữ liệu từ bàn cũ sang bàn mới
        angular.copy(oldtable.tableOrder[$scope.orderIndexIsSelected], t.tableOrder[0]);

        // Chuyển status cho bàn mới thành active
        t.tableStatus = 1;
        t.startTime = oldtable.startTime;

        // xóa dữ liệu order tại bàn cũ
        angular.copy(saleOrder, $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

        // Chuyển deactive bàn cũ nếu bàn cũ không còn hóa đơn
        var tableStatus = tableIsActive($scope.tableIsSelected);
        if (tableStatus == false) {
            $scope.tableIsSelected.tableStatus = 0;
            // $scope.tableIsSelected.startTime = null;
        }

        // đổi bàn hiện tại sang bàn mới
        $scope.tableIsSelected = t;
        $scope.orderIndexIsSelected = 0;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.tableName = $scope.tableIsSelected.tableName;
        $scope.modalSwitchTable.hide();
        toaster.pop('success', "", 'Đã chuyển đơn hàng từ [' + oldtable.tableName + '] sang [' + newtable.tableName + ']');

        if ($scope.isSync) {
            var curtentTable = {};
            angular.copy($scope.tableIsSelected, curtentTable);

            var currentTableOrder = [];
            currentTableOrder.push(curtentTable);
            currentTableOrder[0].tableOrder = [];
            currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);

            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
            .then(function (data) {
                var shiftId = null;
                if (data.docs.length > 0) {
                    shiftId = data.docs[0].shiftId;
                }

                var updateData = {
                    "companyId": $scope.userSession.companyId,
                    "storeId": $scope.currentStore.storeID,
                    "clientId": $scope.clientId,
                    "shiftId": shiftId, //LSFactory.get('shiftId'),
                    "startDate": "",
                    "finishDate": "",
                    "fromTableUuid": oldtable.tableUuid,
                    "fromSaleOrderUuid": oldOrderId,
                    "tables": currentTableOrder,
                    "zone": $scope.tableMap
                };

                updateData = angular.toJson(updateData);
                updateData = JSON.parse(updateData);
                console.log('updateData', updateData);
                socket.emit('moveOrder', updateData);
            })
            .catch(function(error){
                console.log(error);
            });
        }
    }

    // Ghep ban
    $scope.checkPairOrder = function (t) {
        if (t.tableId == $scope.tableIsSelected.tableId && t.tableOrder.length > 1 || t.tableId != $scope.tableIsSelected.tableId) {
            return true;
        }
        return false;
    }

    $scope.checkCurrentOrder = function (index) {
        if ($scope.currentTablePair.tableId == $scope.tableIsSelected.tableId && index == $scope.orderIndexIsSelected) {
            return false;
        }
        return true;
    }

    $scope.openModalPairOrder = function () {
        var cantPrint = checkOrderPrintStatus($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
        if (cantPrint == false) {
            return toaster.pop('warning', "", 'Vui lòng hoàn tất gọi món (Thông báo cho bếp) trước khi thực hiện ghép hoá đơn!');
        }
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != $scope.userSession.userId && $scope.permissionIndex == -1) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        }

        if (cantPrint == true && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
            $ionicModal.fromTemplateUrl('pairing-order.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.modalPairOrder = modal;
                $scope.popoverTableAction.hide();
                $scope.modalPairOrder.show();
                $scope.selecteOrder = true;
            });
        }
    }

    $scope.closeModalPairOrder = function () {
        $scope.modalPairOrder.hide();
    }

    $scope.pairingOrder = function (t) {
        $scope.newtable = t;
        $scope.oldtable = $scope.tableIsSelected;

        $scope.currentTablePair = t;
        if (t.tableOrder.length > 1) {
            $scope.selecteOrder = false;
        } else {
            $scope.Pair(t.tableOrder[0], 0);
        }
    }

    $scope.Pair = function (o, index) {
        var oldtable = {};
        angular.copy($scope.tableIsSelected, oldtable);
        var oldOrderId = oldtable.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleOrderUuid;

        for (var i = 0; i < $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length; i++) {
            var item = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails[i];

            var itemIndex = findIndex(o.saleOrder.orderDetails, 'itemId', item.itemId);
            if (itemIndex != null) {
                o.saleOrder.orderDetails[itemIndex].quantity += parseFloat(item.quantity);
            } else {
                item.quantity = 1;
                o.saleOrder.orderDetails.push(item);
            }
        }
        angular.copy(saleOrder, $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

        var tableStatus = tableIsActive($scope.tableIsSelected);
        if (tableStatus == false) {
            $scope.tableIsSelected.tableStatus = 0;
            // $scope.tableIsSelected.startTime = null;
        }

        toaster.pop('success', "", 'Đã chuyển đơn hàng từ [' + $scope.oldtable.tableName + '] sang [' + $scope.newtable.tableName + ']');
        $scope.tableIsSelected = $scope.newtable;
        $scope.orderIndexIsSelected = index;

        if ($scope.isSync) {
            var curtentTable = {};
            angular.copy($scope.tableIsSelected, curtentTable);

            var currentTableOrder = [];
            currentTableOrder.push(curtentTable);
            currentTableOrder[0].tableOrder = [];
            currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
            
            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
            .then(function (data) {
                var shiftId = null;
                if (data.docs.length > 0) {
                    shiftId = data.docs[0].shiftId;
                }
                var updateData = {
                    "companyId": $scope.userSession.companyId,
                    "storeId": $scope.currentStore.storeID,
                    "clientId": $scope.clientId,
                    "shiftId": shiftId,//LSFactory.get('shiftId'),
                    "startDate": "",
                    "finishDate": "",
                    "fromTableUuid": oldtable.tableUuid,
                    "fromSaleOrderUuid": oldOrderId,
                    "tables": currentTableOrder,
                    "zone": $scope.tableMap
                }

                updateData = angular.toJson(updateData);
                updateData = JSON.parse(updateData);
                console.log('updateData', updateData);
                socket.emit('moveOrder', updateData);
            })
            .catch(function (error) {
                console.log(error);
            });
        }

        $scope.modalPairOrder.hide();
    }

    // Tach hoa don
    $scope.openModalSplitOrder = function () {
        var cantPrint = checkOrderPrintStatus($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
        if (cantPrint == false) {
            return toaster.pop('warning', "", 'Vui lòng hoàn tất gọi món (Thông báo cho bếp) trước khi thực hiện tách hoá đơn!');
        }
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != $scope.userSession.userId && $scope.permissionIndex == -1) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        }
        if (cantPrint == true && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
            $scope.popoverTableAction.hide();

            $ionicModal.fromTemplateUrl('split-order.html', {
                scope: $scope,
                animation: 'slide-in-up',
                backdropClickToClose: false
            }).then(function (modal) {
                $scope.modalSplitOrder = modal;
                $scope.modalSplitOrder.fOrder = {};
                angular.copy($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected], $scope.modalSplitOrder.fOrder);

                $scope.modalSplitOrder.show();
            });
        }
    }

    $scope.closeModalSplitOrder = function () {
        $scope.modalSplitOrder.hide();
    }

    $scope.pickToSplitOrder = function (t) {
        t.quantity -= 1;
        if (!$scope.splitOrder) {
            $scope.splitOrder = {};
            $scope.splitOrder.saleOrder = {};
            angular.copy(saleOrder, $scope.splitOrder.saleOrder);
            if (!$scope.splitOrder.saleOrder.saleOrderUuid) $scope.splitOrder.saleOrder.saleOrderUuid = uuid.v1();
            if (!$scope.splitOrder.saleOrder.createdBy) $scope.splitOrder.saleOrder.createdBy = $scope.userSession.userId;
            if (!$scope.splitOrder.saleOrder.storeId) $scope.splitOrder.saleOrder.storeId = $scope.currentStore.storeID;

        }
        var itemIndex = findIndex($scope.splitOrder.saleOrder.orderDetails, 'itemId', t.itemId);
        if (itemIndex != null) {
            $scope.splitOrder.saleOrder.orderDetails[itemIndex].quantity++;
        } else {
            var temp = {};
            angular.copy(t, temp);
            temp.quantity = 1;
            $scope.splitOrder.saleOrder.orderDetails.push(temp);
        }
    }

    $scope.backToOrder = function (i) {
        i.quantity -= 1;
        var itemIndex = findIndex($scope.modalSplitOrder.fOrder.saleOrder.orderDetails, 'itemId', i.itemId);
        if (itemIndex != null) {
            $scope.modalSplitOrder.fOrder.saleOrder.orderDetails[itemIndex].quantity++;
        } else {
            $scope.modalSplitOrder.fOrder.saleOrder.orderDetails.push(i);
        }
    }

    $scope.cancelSplit = function () {
        $scope.splitOrder = null;
        $scope.modalSplitOrder.fOrder = null;
        $scope.modalSplitOrder.hide();
    }

    $scope.Split = function () {
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] = removeItemZero($scope.modalSplitOrder.fOrder);
        $scope.modalSplitOrder.fOrder = null;

        $scope.tableIsSelected.tableOrder[$scope.tableIsSelected.tableOrder.length] = removeItemZero($scope.splitOrder);
        $scope.splitOrder = null;
        toaster.pop('success', "", 'Đã tách hoá đơn [' + $scope.tableIsSelected.tableName + ']');

        if ($scope.isSync) {
            var currentTableOrder = [];
            currentTableOrder.push($scope.tableIsSelected);
            // var ownerOrder = filterOwnerOrder(currentTableOrder,$scope.userSession.userId);

            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
            .then(function (data) {
                var shiftId = null;
                if (data.docs.length > 0) {
                    shiftId = data.docs[0].shiftId;
                }
                var updateData = {
                    "companyId": $scope.userSession.companyId,
                    "storeId": $scope.currentStore.storeID,
                    "clientId": $scope.clientId,
                    "shiftId": shiftId, //LSFactory.get('shiftId'),
                    "startDate": "",
                    "finishDate": "",
                    "tables": currentTableOrder,
                    "zone": $scope.tableMap
                }

                updateData = angular.toJson(updateData);
                updateData = JSON.parse(updateData);
                console.log('updateData', updateData);
                socket.emit('updateOrder', updateData);
            })
            .catch(function (error) {
                console.log(error);
            })
        }


        $scope.modalSplitOrder.hide();
    }

    $scope.createNewOrder = function () {
        var temp = {};
        temp.saleOrder = {};

        angular.copy(saleOrder, temp.saleOrder);
        $scope.tableIsSelected.tableOrder.push(temp);
        $scope.changeOrder($scope.tableIsSelected.tableOrder.length - 1);
        // LSFactory.set('last-update', $scope.tables);
    }

    $scope.cancelOrder = function () {
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length == 0) {
            if ($scope.tableIsSelected.tableOrder.length > 1) {
                $scope.tableIsSelected.tableOrder.splice($scope.orderIndexIsSelected, 1);
                $scope.orderIndexIsSelected = $scope.tableIsSelected.tableOrder.length - 1;
                var checktable = tableIsActive($scope.tableIsSelected);
                if (checktable == false) {
                    // $scope.tableIsSelected.startTime = null;
                    $scope.tableIsSelected.tableStatus = 0;
                }
                // LSFactory.set('last-update', $scope.tables);
            } else {
                var checktable = tableIsActive($scope.tableIsSelected);
                if (checktable == false) {
                    // $scope.tableIsSelected.startTime = null;
                    $scope.tableIsSelected.tableStatus = 0;
                }
                $scope.orderIndexIsSelected = 0;
            }
        } else {

            toaster.pop('warning', "", 'Không thể xoá đơn hàng đang có hàng hoá');
        }
    }

    // chiều in
    var printDimetion = true;
    // var unGroupProduct = true;

    $scope.pickProduct = function (item) {
        //console.log(item);
        if (!item || !item.itemId) return;
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]
          && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != null
          && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != $scope.userSession.userId
          && $scope.permissionIndex == -1
          ) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        }

        if (item.isSerial) {
            return toaster.pop('warning', "", 'Xin vui lòng sử dụng Suno POS để bán hàng theo IMEI/SERIAL. Liên hệ 08.71.088.188 để được hỗ trợ.');
        }

        if (item.qtyAvailable <= 0 && item.isUntrackedItemSale === false && item.isInventoryTracked === true) {
            return toaster.pop('warning', "", 'Vui lòng nhập kho hàng [' + item.itemName + '], hoặc cấu hình cho phép bán âm hàng hóa này.');
        }

        if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {

            var itemIndex = findIndex($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails, 'itemId', item.itemId);

            if (itemIndex != null && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails[itemIndex].startTime) {
                return toaster.pop('warning', "", 'Hàng hóa này được tính giá theo giờ sử dụng và đã có trong đơn hàng!');
            }
        }

        if ($scope.tableIsSelected.tableOrder.length == 0) {
            $scope.tableIsSelected.tableOrder = [{
                saleOrder: {}
            }]
            angular.copy(saleOrder, $scope.tableIsSelected.tableOrder[0].saleOrder);
        };
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length == 0 && !$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.startTime)
            $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.startTime = new Date();
        // Nếu bàn trống thì khởi tạo order details
        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length == 0) {
            var d = new Date();
            // $scope.tableIsSelected.startTime = d;
            $scope.tableIsSelected.tableStatus = 1;
        }

        item.productItemId = item.itemId;
        item.discount = 0;
        item.discountIsPercent = false;
        item.discountInPercent = 0;
        item.comment = '';

        //Mặc định là bán lẻ
        item.unitPrice = item.retailPrice;
        item.sellPrice = item.retailPrice;
        item.subTotal = item.retailPrice;
        //Chính sách giá

        if ($scope.isMultiplePrice && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.customer) {
            if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.customer.type === 1) { //Giá sỉ
                item.unitPrice = item.wholeSalePrice;
                item.sellPrice = item.wholeSalePrice;
                item.subTotal = item.wholeSalePrice;
            } else if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.customer.type === 2) { //Giá vip
                item.unitPrice = item.vipPrice;
                item.sellPrice = item.vipPrice;
                item.subTotal = item.vipPrice;
            }
        }

        if ($scope.printSetting.unGroupItem) {
            item.quantity = 1;
            item.newOrderCount = 1;

            var flagItem = {};
            angular.copy(item, flagItem);
            if ($scope.hourService.isUse && !$scope.hourService.allProduct && $scope.hourService.itemArr.length > 0) {
                var itemIndexArr = findIndex($scope.hourService.itemArr, 'itemId', item.itemId);
                if (itemIndexArr != null) {
                    flagItem.isServiceItem = true;
                    $scope.startCounter(flagItem);
                }
            }
            if ($scope.pinItem) {
                flagItem.isChild = '(+)';
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.splice($scope.selectedItemIndex + 1, 0, flagItem);
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = $scope.selectedItemIndex;
            } else {
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.push(flagItem);
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length - 1;
                $ionicScrollDelegate.$getByHandle('orders-details').scrollBottom();
            }
        } else {
            var itemIndex = findIndex($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails, 'itemId', item.itemId);
            if (itemIndex != null) {
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails[itemIndex].quantity++;
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails[itemIndex].newOrderCount++;
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = itemIndex;
            } else {
                item.quantity = 1;
                item.newOrderCount = 1;
                var flagItem = {};
                angular.copy(item, flagItem);
                if ($scope.hourService.isUse && !$scope.hourService.allProduct && $scope.hourService.itemArr.length > 0) {
                    var itemIndexArr = findIndex($scope.hourService.itemArr, 'itemId', item.itemId);
                    if (itemIndexArr != null) {
                        flagItem.isServiceItem = true;
                        $scope.startCounter(flagItem);
                    }
                }
                if (printDimetion) {
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.push(flagItem);
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length - 1;
                    $ionicScrollDelegate.$getByHandle('orders-details').scrollBottom();
                } else {
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.unshift(flagItem);
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = 0;
                }
            }
        }

        calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

        $scope.suglist = false;
        $scope.key = null;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.hasNotice = true;
        $scope.ItemIsSelected = {};
        //console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
    }

    $scope.printOrderBarKitchenInMobile = function (printDevice, saleOrder, BarItemSetting, setting) {

        var barOrder = angular.copy(saleOrder);
        barOrder.orderDetails = [];
        var kitchenOder = angular.copy(saleOrder);
        kitchenOder.orderDetails = [];
        for (var i = 0; i < saleOrder.orderDetails.length; i++) {
            var itemIndex = findIndex(BarItemSetting, 'itemId', saleOrder.orderDetails[i].itemId);
            if (itemIndex != null) {
                barOrder.orderDetails.push(saleOrder.orderDetails[i]);
            } else {
                kitchenOder.orderDetails.push(saleOrder.orderDetails[i]);
            }
        }

        if (kitchenOder.orderDetails.length > 0 && barOrder.orderDetails.length > 0) {
            kitchenOder = prepairOrderMobile(kitchenOder, setting);
            barOrder = prepairOrderMobile(barOrder, setting);

            $scope.printInMobile(kitchenOder, "BB", printDevice.kitchenPrinter).then(
              function (success) {
                  setTimeout(function () {
                      //                     window.Suno.printer_disconnect(var data = {ip: printDevice.kitchenPrinter});
                      $scope.printInMobile(barOrder, "BB", printDevice.barPrinter).then(function (success) {

                      });
                  }, 3000);
              }
            );
        } else if (barOrder.orderDetails.length > 0) {
            printOrderInMobile(printDevice.barPrinter, barOrder, "BB", setting);
        } else if (kitchenOder.orderDetails.length > 0) {
            printOrderInMobile(printDevice.kitchenPrinter, kitchenOder, "BB", setting);
        }

    }

    $scope.printInMobile = function (saleOrder, type, printer) {
        //Print
        var deferred = $q.defer();
        var template = initPrintTemplate(saleOrder, type);

        data = {
            printer_type: parseInt(printer.printer), // 0: Error; 1:Bixolon; 2: Fujitsu
            ip: printer.ip,
            texts: template,
            feed: 30
        };

        window.Suno.printer_print(
          data, function (message) {
              console.log("IN THÀNH CÔNG");
              deferred.resolve();
          }, function (message) {
              console.log("CÓ LỖI XẢY RA");
              deferred.reject("Có lỗi xảy ra!");
          });
        return deferred.promise;
    }

    $scope.noticeToTheKitchen = function () {
        // console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
        if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
            if ($scope.tableIsSelected
              && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != $scope.userSession.userId
              && $scope.permissionIndex == -1
              ) {
                return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
            }

            $scope.showOption = false;
            // Kiem tra co mon trong hoa don can bao bep hay ko, neu hoa don ko co cap nhat mon moi thi ko bao bep nua

            var cantPrint = checkOrderPrintStatus($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
            if (cantPrint == false) {
                // Co mon can bao bep 
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.hasNotice = false;
                if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.printed) {
                    $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.printed = [];
                }
                // Chi in nhung mon moi order
                var currentOrder = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected];
                var printOrder = {};
                angular.copy(currentOrder, printOrder);

                for (var i = 0; i < printOrder.saleOrder.orderDetails.length; i++) {
                    printOrder.saleOrder.orderDetails[i].quantity = printOrder.saleOrder.orderDetails[i].newOrderCount;
                }
                printOrder = removeItemZero(printOrder);
                printOrder.saleOrder.printedCount = currentOrder.saleOrder.printed.length + 1;
                if (printOrder.saleOrder.printed) delete printOrder.saleOrder.printed;
                currentOrder.saleOrder.printed.push(printOrder);
                var setting = {
                    companyInfo: $scope.companyInfo.companyInfo,
                    allUsers: $scope.authBootloader.users,
                    store: $scope.currentStore
                }

                if ($scope.printSetting.printNoticeKitchen == false) {
                    // Neu cho phep in bao bep o thiet lap in 
                    if ($scope.isWebView) {
                        if ($scope.printSetting.unGroupItem && $scope.printSetting.noticeByStamps) {
                            printOrder.saleOrder = prepProcessStamps(printOrder.saleOrder);
                            printOrderInBrowser(printer, printOrder.saleOrder, 256, setting);
                        }
                        else {
                            if ($scope.printSetting.unGroupBarKitchen)
                                printOrderBarKitchen(printer, printOrder.saleOrder, $scope.BarItemSetting, setting);
                            else
                                printOrderInBrowser(printer, printOrder.saleOrder, 128, setting);
                        }
                    } else {
                        if ($scope.isIOS && $scope.printDevice && $scope.printDevice.kitchenPrinter && $scope.printDevice.kitchenPrinter.status) {
                            if ($scope.printSetting.unGroupBarKitchen)
                                $scope.printOrderBarKitchenInMobile($scope.printDevice, printOrder.saleOrder, $scope.BarItemSetting, setting);
                            else
                                printOrderInMobile($scope.printDevice.kitchenPrinter, printOrder.saleOrder, "BB", setting);
                        } else if ($scope.isAndroid && $scope.printDevice && $scope.printDevice.kitchenPrinter && $scope.printDevice.kitchenPrinter.status) {
                            if ($scope.printSetting.unGroupBarKitchen)
                                $scope.printOrderBarKitchenInMobile($scope.printDevice, printOrder.saleOrder, $scope.BarItemSetting, setting);
                            else
                                printOrderInMobile($scope.printDevice.kitchenPrinter, printOrder.saleOrder, "BB", setting);
                        }
                    }
                }

                for (var i = 0; i < currentOrder.saleOrder.orderDetails.length; i++) {
                    currentOrder.saleOrder.orderDetails[i].newOrderCount = 0;
                    currentOrder.saleOrder.orderDetails[i].comment = '';
                }
                ($scope.tables.length > 1) ? $scope.leftviewStatus = false : $scope.leftviewStatus = true;
                toaster.pop('warning', "", 'Đã gửi đơn hàng xuống bếp!');

                if ($scope.isSync) {
                    // var currentTableOrder = [];
                    // currentTableOrder.push($scope.tableIsSelected);
                    // var ownerOrder = filterOwnerOrder(currentTableOrder,$scope.userSession.userId);
                    var curtentTable = {};
                    angular.copy($scope.tableIsSelected, curtentTable);
                    
                    var currentTableOrder = [];
                    currentTableOrder.push(curtentTable);
                    currentTableOrder[0].tableOrder = [];
                    currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
                    DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                    .then(function (data) {
                        var shiftId = null;
                        if (data.docs.length > 0) {
                            shiftId = data.docs[0].shiftId;
                        }

                        for (var x = 0; x < currentTableOrder.length; x++) {
                            for (var y = 0; y < currentTableOrder[x].tableOrder.length; y++) {
                                currentTableOrder[x].tableOrder[y].saleOrder.lastSyncID++;
                            }
                        }

                        var updateData = {
                            "companyId": $scope.userSession.companyId,
                            "storeId": $scope.currentStore.storeID,
                            "clientId": $scope.clientId,
                            "shiftId": shiftId,//LSFactory.get('shiftId'),
                            "startDate": "",
                            "finishDate": "",
                            "tables": currentTableOrder,
                            "zone": $scope.tableMap
                        }
                        updateData = angular.toJson(updateData);
                        updateData = JSON.parse(updateData);
                        //console.log('updateData', updateData);
                        socket.emit('updateOrder', updateData);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });

                    if ($scope.printSetting.printNoticeKitchen == false && !$scope.isWebView && (!$scope.printDevice || !$scope.printDevice.kitchenPrinter.status)) {
                        // nếu không phải trên trình duyệt + cho phép in bếp + cho phép in hộ thì mới gửi lệnh in hộ lên socket
                        DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                        .then(function (data) {
                            var shiftId = null;
                            if (data.docs.length > 0) {
                                shiftId = data.docs[0].shiftId;
                            }
                            var printHelperData = {
                                "companyId": $scope.userSession.companyId,
                                "storeId": $scope.currentStore.storeID,
                                "clientId": $scope.clientId,
                                "shiftId": shiftId,//LSFactory.get('shiftId'),
                                "printOrder": printOrder.saleOrder,
                                "printSetting": setting,
                                "orderType": "kitchen"
                            }

                            printHelperData = angular.toJson(printHelperData);
                            printHelperData = JSON.parse(printHelperData);
                            socket.emit('printHelper', printHelperData);
                        })
                        .catch(function (error) {
                            console.log(error);
                        });
                    }
                }
            }
        }
    }

    $scope.rePrint = function (o) {
        var setting = {
            companyInfo: $scope.companyInfo.companyInfo,
            allUsers: $scope.authBootloader.users,
            store: $scope.currentStore
        }
        var printOrder = o;
        // if($scope.isWebView){
        //   // console.log('In bếp từ trình duyệt');
        //   printOrderInBrowser(printer, o.saleOrder, 128, setting);
        // }else{            
        //   if($scope.isIOS && $scope.printDevice && $scope.printDevice.kitchenPrinter.status && angular.isDefined(window.Suno)){
        //      // console.log('in bep truc tiep tren IOS');
        //      // printOrderInMobile($scope.printDevice.kitchenPrinter.ip,o.saleOrder,"BB",setting);
        //   }else if($scope.isAndroid){
        //     // console.log('in bep Android');
        //     // printOrderInMobile($scope.printDevice.kitchenPrinter.ip,o.saleOrder,"BB",setting);
        //   }
        // }


        if ($scope.printSetting.printNoticeKitchen == false) {
            // Neu cho phep in bao bep o thiet lap in 
            if ($scope.isWebView) {
                if ($scope.printSetting.unGroupItem && $scope.printSetting.noticeByStamps) {
                    printOrder.saleOrder = prepProcessStamps(printOrder.saleOrder);
                    printOrderInBrowser(printer, printOrder.saleOrder, 256, setting);
                }
                else {
                    if ($scope.printSetting.unGroupBarKitchen)
                        printOrderBarKitchen(printer, printOrder.saleOrder, $scope.BarItemSetting, setting);
                    else
                        printOrderInBrowser(printer, printOrder.saleOrder, 128, setting);
                }
            } else {
                if ($scope.isIOS && $scope.printDevice && $scope.printDevice.kitchenPrinter && $scope.printDevice.kitchenPrinter.status) {
                    if ($scope.printSetting.unGroupBarKitchen)
                        $scope.printOrderBarKitchenInMobile($scope.printDevice, printOrder.saleOrder, $scope.BarItemSetting, setting);
                    else
                        printOrderInMobile($scope.printDevice.kitchenPrinter, printOrder.saleOrder, "BB", setting);
                } else if ($scope.isAndroid && $scope.printDevice && $scope.printDevice.kitchenPrinter && $scope.printDevice.kitchenPrinter.status) {
                    if ($scope.printSetting.unGroupBarKitchen)
                        $scope.printOrderBarKitchenInMobile($scope.printDevice, printOrder.saleOrder, $scope.BarItemSetting, setting);
                    else
                        printOrderInMobile($scope.printDevice.kitchenPrinter, printOrder.saleOrder, "BB", setting);
                }
            }
        }

        ($scope.tables.length > 1) ? $scope.leftviewStatus = false : $scope.leftviewStatus = true;
        toaster.pop('warning', "", 'Đã gửi đơn hàng xuống bếp!');
        $scope.modalPrintedList.hide();
    }

    $scope.closeRePrintList = function () {
        $scope.modalPrintedList.hide();
    }

    $scope.showChangeQuantity = false;

    $scope.openChangeQuantity = function (op) {
        $scope.selectedItem.changeQuantity = 1
        $scope.showChangeQuantity = true;
        $scope.showChangeQuantityOption = op;
    }

    $scope.closeChangeQuantity = function () {
        $scope.showChangeQuantity = false;
    }

    $scope.removeItem = function (q) {
        $scope.showChangeQuantityOption = 1;
        $scope.submitChangeQuantity(q);
    }

    $scope.submitChangeQuantity = function (quantity) {

        if (!quantity) {
            return toaster.pop('warning', "", 'Vui lòng nhập số lượng thay đổi');
        } else {
            if ($scope.showChangeQuantityOption == 2) {
                // console.log('tăng ' + quantity);
                toaster.pop('success', "", 'Tăng ' + quantity + ' [' + $scope.selectedItem.itemName + '] trong hoá đơn');
                $scope.changeQuantity(quantity, $scope.selectedItem);
                $scope.selectedItem.changeQuantity = null;
                $scope.hideItemOption();
            } else if ($scope.showChangeQuantityOption == 1) {
                // console.log('giảm ' + quantity);
                $scope.checkRemoveItem(-quantity, $scope.selectedItem);
                $scope.selectedItem.changeQuantity = null;
                $scope.hideItemOption();
            }
            $scope.showChangeQuantity = false;
        }

    }

    $scope.fastRemoveItem = function (quantity, item, $event) {
        // console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
        $scope.selectedItem = item;
        $scope.checkRemoveItem(-quantity, $scope.selectedItem);
        $scope.selectedItem.changeQuantity = null;
        if ($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    }


    $scope.changeQuantity = function (num, item, $event) {
        // Kiểm tra quyền thao tác trên hóa đơn
        // console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
        var saleOrder = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder;
        if (saleOrder.createdBy != $scope.userSession.userId && $scope.permissionIndex == -1) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        }

        if (num) {
            if (num > 0) {
                item.newOrderCount = parseFloat(num) + parseFloat(item.newOrderCount);
                item.newOrderCount = (item.newOrderCount === parseInt(item.newOrderCount, 10)) ? item.newOrderCount : parseFloat(item.newOrderCount).toFixed(2);
                item.quantity = parseFloat(num) + parseFloat(item.quantity);
                item.quantity = (item.quantity === parseInt(item.quantity, 10)) ? item.quantity : parseFloat(item.quantity).toFixed(2);
            } else if (num < 0) {
                if (item.quantity < -num) num = -item.quantity;
                item.quantity = parseFloat(num) + parseFloat(item.quantity);
                item.quantity = (item.quantity === parseInt(item.quantity, 10)) ? item.quantity : parseFloat(item.quantity).toFixed(2);
                if (item.newOrderCount > 0 && item.newOrderCount >= -num) {
                    item.newOrderCount = parseFloat(num) + parseFloat(item.newOrderCount);
                    item.newOrderCount = (item.newOrderCount === parseInt(item.newOrderCount, 10)) ? item.newOrderCount : parseFloat(item.newOrderCount).toFixed(2);
                } else
                    if (item.newOrderCount > 0 && item.newOrderCount < -num) item.newOrderCount = 0;

            }
            var itemIndex = findIndex($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails, 'itemId', item.itemId);
            if (item.quantity > 0) {
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = itemIndex;
            } else {
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = 0;
                $scope.showOption = false;
            }
            calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

            $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] = removeItemZero($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
            removeUnNotice($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
            // console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
            var tableStatus = tableIsActive($scope.tableIsSelected);
            if (tableStatus == false) {
                $scope.tableIsSelected.tableStatus = 0;
                // $scope.tableIsSelected.startTime = null;
            }

            if (num < 0 && $scope.isSync) {
                // var currentTableOrder = [];
                // currentTableOrder.push($scope.tableIsSelected);
                // var ownerOrder = filterOwnerOrder(currentTableOrder,$scope.userSession.userId);
                if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length == 0 && $scope.isSync) {
                    var curtentTable = {};
                    angular.copy($scope.tableIsSelected, curtentTable);

                    var currentTableOrder = [];
                    currentTableOrder.push(curtentTable);
                    currentTableOrder[0].tableOrder = [];
                    currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);

                    DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                    .then(function (data) {
                        var shiftId = null;
                        if (data.docs.length > 0) {
                            shiftId = data.docs[0].shiftId;
                        }
                        var completeOrder = {
                            "companyId": $scope.userSession.companyId,
                            "storeId": $scope.currentStore.storeID,
                            "clientId": $scope.clientId,
                            "shiftId": shiftId, //LSFactory.get('shiftId'),
                            "startDate": "",
                            "finishDate": "",
                            "tables": currentTableOrder,
                            "zone": $scope.tableMap
                        }

                        completeOrder = angular.toJson(completeOrder);
                        completeOrder = JSON.parse(completeOrder);
                        console.log('completeOrder', completeOrder);
                        socket.emit('completeOrder', completeOrder);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
                    // console.log('completeOrder');
                    // console.log(completeOrder.tables);
                } else if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.hasNotice) {
                    var curtentTable = {};
                    angular.copy($scope.tableIsSelected, curtentTable);

                    var currentTableOrder = [];
                    currentTableOrder.push(curtentTable);
                    currentTableOrder[0].tableOrder = [];
                    currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
                    DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                    .then(function (data) {
                        var shiftId = null;
                        if (data.docs.length > 0) {
                            shiftId = data.docs[0].shiftId;
                        }
                        var updateData = {
                            "companyId": $scope.userSession.companyId,
                            "storeId": $scope.currentStore.storeID,
                            "clientId": $scope.clientId,
                            "shiftId": shiftId,//LSFactory.get('shiftId'),
                            "startDate": "",
                            "finishDate": "",
                            "tables": currentTableOrder,
                            "zone": $scope.tableMap
                        }

                        updateData = angular.toJson(updateData);
                        updateData = JSON.parse(updateData);
                        console.log('updateData', updateData);
                        socket.emit('updateOrder', updateData);
                    })
                    .catch(function (error) {
                        console.log(error);
                    })
                }
            }


        } else {
            return toaster.pop('warning', "", 'Vui lòng nhập số lượng thay đổi');
        }
        if ($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    }

    $scope.checkRemoveItem = function (num, item) {
        var saleOrder = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder;
        // var removeSetting = $scope.removeSetting;
        if (saleOrder.createdBy != $scope.userSession.userId && $scope.permissionIndex == -1) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        } else {
            switch ($scope.removeSetting) {
                case 1:
                    // Nếu cho phép huỷ món ko cần xác nhận
                    $scope.changeQuantity(num, item);
                    toaster.pop('success', "", 'Giảm ' + -num + ' [' + item.itemName + '] trong hoá đơn');
                    break;
                case 2:
                    // Được hủy món chưa in bếp, khi đã in bếp thì cần xác nhận quản lý/chủ cửa hàng
                    if (item.newOrderCount > 0 && item.newOrderCount >= -num) {
                        $scope.changeQuantity(num, item);
                        toaster.pop('success', "", 'Giảm ' + -num + ' [' + item.itemName + '] trong hoá đơn');
                    } else {
                        $scope.staff = {};
                        var findRoleIndex = findIndex($scope.authBootloader.rolesGranted, 'roleName', 'Quản lý');
                        if (findRoleIndex != null) {
                            $ionicPopup.show({
                                title: 'Xác nhận huỷ món',
                                subTitle: 'Bạn muốn huỷ món [' + item.itemName + '] ra khỏi đơn hàng ?',
                                scope: $scope,
                                buttons: [{
                                    text: 'Trở lại'
                                }, {
                                    text: '<b>Xác nhận</b>',
                                    type: 'button-positive',
                                    onTap: function (e) {
                                        $scope.changeQuantity(num, item);
                                        toaster.pop('success', "", 'Giảm ' + -num + ' [' + item.itemName + '] trong hoá đơn');
                                    }
                                }]
                            });
                        } else {
                            $ionicPopup.show({
                                template: '<input type="text" ng-model="staff.username" placeholder="Tên đăng nhập"><input type="password" ng-model="staff.password" placeholder="Mật khẩu">',
                                title: 'Xác nhận huỷ món',
                                subTitle: 'Nhập thông tin tài khoản Quản lý để xác nhận huỷ món đã báo bếp',
                                scope: $scope,
                                buttons: [{
                                    text: 'Trở lại'
                                }, {
                                    text: '<b>Xác nhận</b>',
                                    type: 'button-positive',
                                    onTap: function (e) {
                                        if (!$scope.staff || !$scope.staff.username || !$scope.staff.password) {
                                            toaster.pop('error', "", 'Vui lòng kiểm tra thông tin tài khoản!');
                                            return false;
                                        } else {
                                            d = {
                                                "username": $scope.staff.username,
                                                "password": $scope.staff.password
                                            }
                                            url = Api.getMemberPermission;
                                            asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', d, function (data, status) {
                                                if (data) {
                                                    var permissionList = data.permissions;
                                                    var permission = permissionList.indexOf("POSIM_Manage");
                                                    if (permission != -1) {
                                                        $scope.changeQuantity(num, item);
                                                        toaster.pop('success', "", 'Giảm ' + num + ' [' + item.itemName + '] trong hoá đơn');
                                                    } else {
                                                        toaster.pop('error', "", 'Tài khoản này không có quyền huỷ món!');
                                                    }
                                                }
                                            }, function (e) {
                                                toaster.pop('error', "", 'Vui lòng kiểm tra thông tin tài khoản!');
                                            }, true, 'check-login');
                                        }
                                    }
                                }]
                            });
                        }
                    }
                    break;
                case 3:
                    // xác nhận khi huỷ món
                    $scope.staff = {};
                    var findRoleIndex = findIndex($scope.authBootloader.rolesGranted, 'roleName', 'Quản lý');
                    if (findRoleIndex != null) {
                        $ionicPopup.show({
                            // template: '<input type="text" ng-model="staff.username" placeholder="Tên đăng nhập"><input type="password" ng-model="staff.password" placeholder="Mật khẩu">',
                            title: 'Xác nhận huỷ món',
                            subTitle: 'Bạn muốn huỷ món [' + item.itemName + '] ra khỏi đơn hàng ?',
                            scope: $scope,
                            buttons: [{
                                text: 'Trở lại'
                            }, {
                                text: '<b>Xác nhận</b>',
                                type: 'button-positive',
                                onTap: function (e) {
                                    $scope.changeQuantity(num, item);
                                    toaster.pop('success', "", 'Giảm ' + num + ' [' + item.itemName + '] trong hoá đơn');
                                }
                            }]
                        });
                    } else {
                        $ionicPopup.show({
                            template: '<input type="text" ng-model="staff.username" placeholder="Tên đăng nhập"><input type="password" ng-model="staff.password" placeholder="Mật khẩu">',
                            title: 'Xác nhận huỷ món',
                            subTitle: 'Nhập thông tin tài khoản Quản lý để xác nhận huỷ món đã báo bếp',
                            scope: $scope,
                            buttons: [{
                                text: 'Trở lại'
                            }, {
                                text: '<b>Xác nhận</b>',
                                type: 'button-positive',
                                onTap: function (e) {
                                    if (!$scope.staff || !$scope.staff.username || !$scope.staff.password) {
                                        toaster.pop('error', "", 'Vui lòng kiểm tra thông tin tài khoản!');
                                        return false;
                                    } else {
                                        d = {
                                            "username": $scope.staff.username,
                                            "password": $scope.staff.password
                                        }
                                        url = Api.getMemberPermission;
                                        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', d, function (data, status) {
                                            if (data) {
                                                var permissionList = data.permissions;
                                                var permission = permissionList.indexOf("POSIM_Manage");
                                                if (permission != -1) {
                                                    $scope.changeQuantity(num, item);
                                                    toaster.pop('success', "", 'Giảm ' + num + ' [' + item.itemName + '] trong hoá đơn');
                                                } else {
                                                    toaster.pop('error', "", 'Tài khoản này không có quyền huỷ món!');
                                                }
                                            }
                                        }, function (e) {
                                            toaster.pop('error', "", 'Vui lòng kiểm tra thông tin tài khoản!');
                                        }, true, 'check-login');
                                    }
                                }
                            }]
                        });
                    }
                    break;
                case 4:
                    $scope.staff = {};
                    var findRoleIndex = findIndex($scope.authBootloader.rolesGranted, 'roleName', 'Chủ cửa hàng');
                    if (findRoleIndex != null) {
                        $ionicPopup.show({
                            // template: '<input type="text" ng-model="staff.username" placeholder="Tên đăng nhập"><input type="password" ng-model="staff.password" placeholder="Mật khẩu">',
                            title: 'Xác nhận huỷ món',
                            subTitle: 'Bạn muốn huỷ món [' + item.itemName + '] ra khỏi đơn hàng ?',
                            scope: $scope,
                            buttons: [{
                                text: 'Trở lại'
                            }, {
                                text: '<b>Xác nhận</b>',
                                type: 'button-positive',
                                onTap: function (e) {
                                    $scope.changeQuantity(num, item);
                                    toaster.pop('success', "", 'Giảm ' + num + ' [' + item.itemName + '] trong hoá đơn');
                                }
                            }]
                        });
                    } else {
                        $ionicPopup.show({
                            template: '<input type="text" ng-model="staff.username" placeholder="Tên đăng nhập"><input type="password" ng-model="staff.password" placeholder="Mật khẩu">',
                            title: 'Xác nhận huỷ món',
                            subTitle: 'Nhập thông tin tài khoản Quản lý để xác nhận huỷ món đã báo bếp',
                            scope: $scope,
                            buttons: [{
                                text: 'Trở lại'
                            }, {
                                text: '<b>Xác nhận</b>',
                                type: 'button-positive',
                                onTap: function (e) {
                                    if (!$scope.staff || !$scope.staff.username || !$scope.staff.password) {
                                        toaster.pop('error', "", 'Vui lòng kiểm tra thông tin tài khoản!');
                                        return false;
                                    } else {
                                        d = {
                                            "username": $scope.staff.username,
                                            "password": $scope.staff.password
                                        }
                                        url = Api.getMemberPermission;
                                        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', d, function (data, status) {
                                            if (data) {
                                                var permissionList = data.permissions;
                                                var permission = permissionList.indexOf("POSIM_Price_ReadBuyPrice");
                                                if (permission != -1) {
                                                    $scope.changeQuantity(num, item);
                                                    toaster.pop('success', "", 'Giảm ' + num + ' [' + item.itemName + '] trong hoá đơn');
                                                } else {
                                                    toaster.pop('error', "", 'Tài khoản này không có quyền huỷ món!');
                                                }
                                            }
                                        }, function (e) {
                                            toaster.pop('error', "", 'Vui lòng kiểm tra thông tin tài khoản!');
                                        }, true, 'check-login');
                                    }
                                }
                            }]
                        });
                    }
                    break;

            };
        }
    }

    $scope.changeItemPrice = function (price) {
        // console.log($scope.selectedItem,price);
        if (!price || price == 0) {
            return toaster.pop('warning', "", 'Vui lòng kiểm tra lại giá bán mới.');
        } else
            $scope.selectedItem.unitPrice = parseFloat(price);
    }

    $scope.showOption = false;

    $scope.openItemOption = function (i, itemIndex) {

        $scope.selectedItem = i;
        $scope.showOption = true;
        $scope.selectedItemIndex = itemIndex;
        // var itemIndex = findIndex($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails, 'itemId', i.itemId);
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = itemIndex;
        $ionicScrollDelegate.$getByHandle('orders-details').scrollTop();
    }

    $scope.pin = function (i, index, $event) {
        $scope.selectedItem = i;

        if ($scope.pinItem && $scope.pinItem.itemId == i.itemId && index == $scope.selectedItemIndex) {
            $scope.pinItem = null;
        } else {
            $scope.pinItem = i;
        }
        $scope.selectedItemIndex = index;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = index;

        if ($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    }

    $scope.hideItemOption = function () {
        $scope.showOption = false;
    }

    $scope.showOrderDiscount = false;

    $scope.openOrderDiscount = function () {
        $scope.showOrderDiscount = !$scope.showOrderDiscount;
    }

    $scope.showOrderDetails = false;

    $scope.openOrderDetails = function () {
        if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
            $scope.showOrderDetails = !$scope.showOrderDetails;

        }
    }
    $scope.closeOrderDetails = function () {
        $scope.showOrderDetails = false;
        $ionicScrollDelegate.resize();
    }

    $ionicPopover.fromTemplateUrl('payment-method.html', {
        scope: $scope
    }).then(function (popover) {
        $scope.popoverPaymentMethod = popover;
    });

    $scope.openPopOverPaymentMethod = function (e) {
        if ($scope.receiptVoucher && $scope.receiptVoucher.length == 0) {
            $scope.popoverPaymentMethod.show(e);
        }
    }

    $scope.changePaymentMethod = function (id) {
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].paymentMethodId = id;
        $scope.popoverPaymentMethod.hide();
    }

    $scope.receiptVoucher = [];

    $scope.addPaymentMethod = function () {
        if ($scope.receiptVoucher.length == 0) {
            var saleOrder = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder;
            if (saleOrder.amountPaid < saleOrder.total) {
                $scope.receiptVoucher.push({
                    "paymentMethodId": saleOrder.payments[0].paymentMethodId == 1 ? 2 : 1,
                    "status": 0,
                    "amount": (parseFloat(saleOrder.amountPaid) < parseFloat(saleOrder.total)) ? saleOrder.total - saleOrder.amountPaid : 0
                });
            }
        }
    }

    $scope.removePaymentMethod = function () {
        $scope.receiptVoucher = [];
    }

    $scope.sugUserList = false;
    $scope.customerS = {};
    $scope.search_user = function () {
        if (!$scope.customerS.key) {
            $scope.sugUserList = false;
            return;
        }
        var url = Api.customers + $scope.customerS.key;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            $scope.searchUserList = data.customers;
        }, function (error) {
            // console.log(error);
            toaster.pop('error', "", error.responseStatus.message);
        }, true, 'search-user');
        $scope.sugUserList = true;
    }

    $scope.addCustomer = function (u) {
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.customer = u;

        $scope.sugUserList = false;
        $scope.customerS = {};
    }

    $scope.removeUser = function () {
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.customer = null;
    }

    $scope.openModalCreateCustomer = function () {
        $ionicModal.fromTemplateUrl('create-new-customer.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modalCreateCustomer = modal;
            $scope.customer = {};
            $scope.modalCreateCustomer.show();
        });
    }

    $scope.closeModalCreateCustomer = function () {
        $scope.modalCreateCustomer.hide();
    }

    $scope.closeModalCustomer = function () {
        $scope.modalCreateCustomer.hide();
    }

    $scope.saveCustomer = function (c) {
        var url = Api.addCustomer;
        var d = {
            customer: c
        }

        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', d, function (data, status) {
            if (data && data.customerId) {
                c.customerId = data.customerId;
                c.code = data.code;
                $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.customer = c;
                toaster.pop('success', "", 'Đã thêm khách hàng mới thành công.');
                $scope.modalCreateCustomer.hide();
            }
        }, function (error) {
            toaster.pop('error', "", error.responseStatus.message);
        }, true, 'save-customer');

    }

    $scope.submitOrder = function (isPrint) {
        // console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);exit;
        if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy != $scope.userSession.userId && $scope.permissionIndex == -1) {
            return toaster.pop('error', "", 'Bạn không được phép thao tác trên đơn hàng của nhân viên khác');
        }

        if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
            if ($scope.hourService.isUse) {
                var indexService = findIndex($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails, 'timer', true);
                if (indexService != null) {
                    return toaster.pop('warning', "", 'Bạn chưa hoàn tất tính giờ cho đơn hàng hiện tại');
                }
            }

            if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.hasNotice) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.hasNotice = false;
            prepareOrder($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

            if ($scope.settings.saleSetting.allowDebtPayment == false) {
                if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.amountPaid < $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total)
                    return toaster.pop('warning', "", 'Hệ thống được thiết lập không cho phép bán nợ! Vui lòng thiết lập cho phép bán nợ để có thể xử lý đơn hàng này!');
            }

            if ($scope.selectedItem) {
                $scope.selectedItem = null;
                $scope.hideItemOption();
            }

            var submitOrder = angular.copy($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

            for (var i = 0; i < submitOrder.orderDetails.length; i++) {
                var item = submitOrder.orderDetails[i];
                if (item.discountIsPercent == true) {
                    item.discount = item.discountInPercent;
                }
            }
            var d = {
                saleOrder: submitOrder,
                currentStore: $scope.currentStore,
                user: $scope.userSession
            };

            var url = Api.submitOrder;
            asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', d, function (data, status) {
                if (data) {
                    $scope.showOrderDetails = false;
                    ($scope.tables.length > 1) ? $scope.leftviewStatus = false : $scope.leftviewStatus = true;
                    if ($scope.receiptVoucher.length > 0 && $scope.receiptVoucher[0].amount > 0) {
                        var url = Api.receipt;
                        var d = {
                            "saleOrderId": data.saleOrderId,
                            "storeId": $scope.currentStore.storeID,
                            "isUpdateAmountPaid": false,
                            "receiptVoucher": $scope.receiptVoucher[0]
                        }
                        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', d, function (data, status) {
                            $scope.receiptVoucher = [];
                        }, function (e) { console.log(e) }, true, 'createReceipt');
                    }
                    // console.log('z = ' + isPrint);
                    if (isPrint == 1) {
                        // console.log('z2');
                        var printOrder = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder;
                        printOrder.saleOrderCode = data.saleOrderCode;
                        var setting = {
                            companyInfo: $scope.companyInfo.companyInfo,
                            allUsers: $scope.authBootloader.users,
                            store: $scope.currentStore
                        }

                        if ($scope.isWebView) {
                            var rs = printOrderInBrowser(printer, printOrder, 1, setting);
                            if (rs) {
                                toaster.pop('success', "", 'Đã lưu & in hoá đơn thành công.');
                            } else {
                                toaster.pop('error', "", 'Đã lưu hóa đơn nhưng không in được, vui lòng kiểm tra lại mẫu in.');
                            }
                        } else if ($scope.isIOS && $scope.printDevice && $scope.printDevice.cashierPrinter && $scope.printDevice.cashierPrinter.status) {
                            // console.log('in bep truc tiep tren IOS');
                            // printOrderInMobile($scope.printDevice.cashierPrinter.ip,printOrder,"TT",setting);

                            printOrderInMobile($scope.printDevice.cashierPrinter, printOrder, "TT", setting);
                            toaster.pop('success', "", 'Đã lưu & in hoá đơn thành công.');
                        } else if ($scope.isAndroid && $scope.printDevice && $scope.printDevice.cashierPrinter && $scope.printDevice.cashierPrinter.status) {
                            // console.log('in bep Android');
                            printOrderInMobile($scope.printDevice.cashierPrinter, printOrder, "TT", setting);
                            toaster.pop('success', "", 'Đã lưu hoá đơn thành công.');
                        }

                    }

                    if ($scope.isSync) {
                        var curtentTable = {};
                        angular.copy($scope.tableIsSelected, curtentTable);

                        var currentTableOrder = [];
                        currentTableOrder.push(curtentTable);
                        currentTableOrder[0].tableOrder = [];
                        currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
                        DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                        .then(function (data) {
                            var shiftId = null;
                            if (data.docs.length > 0) {
                                shiftId = data.docs[0].shiftId;
                            }
                            var completeOrder = {
                                "companyId": $scope.userSession.companyId,
                                "storeId": $scope.currentStore.storeID,
                                "clientId": $scope.clientId,
                                "shiftId": shiftId,//LSFactory.get('shiftId'),
                                "startDate": "",
                                "finishDate": "",
                                "tables": currentTableOrder,
                                "zone": $scope.tableMap
                            }

                            completeOrder = angular.toJson(completeOrder);
                            completeOrder = JSON.parse(completeOrder);
                            console.log('completeOrder', completeOrder);
                            //socket.emit('completeOrder', completeOrder);
                        })
                        .catch(function (error) {
                            console.log(error);
                        })

                        if ($scope.printSetting.printSubmitOrder == false && !$scope.isWebView && (!$scope.printDevice || !$scope.printDevice.cashierPrinter.status)) {
                            // nếu không phải trên trình duyệt + cho phép in thanh toán + cho phép in hộ thì mới gửi lệnh in hộ lên socket

                            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                            .then(function (data) {
                                var shiftId = null;
                                if (data.docs.length > 0) {
                                    shiftId = data.docs[0].shiftId;
                                }
                                var printHelperData = {
                                    "companyId": $scope.userSession.companyId,
                                    "storeId": $scope.currentStore.storeID,
                                    "clientId": $scope.clientId,
                                    "shiftId": shiftId, //LSFactory.get('shiftId'),
                                    "printOrder": printOrder,
                                    "printSetting": setting,
                                    "orderType": "cashier"
                                }

                                printHelperData = angular.toJson(printHelperData);
                                printHelperData = JSON.parse(printHelperData);
                                socket.emit('printHelper', printHelperData);
                            })
                            .catch(function (error) {
                                console.log(error);
                            })
                        }
                    }
                    angular.copy(saleOrder, $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
                    var tableStatus = tableIsActive($scope.tableIsSelected);
                    if (tableStatus == false) {
                        $scope.tableIsSelected.tableStatus = 0;
                        // $scope.tableIsSelected.startTime = null;
                    }
                }
            }, function (e) {
                toaster.pop('error', "", e.responseStatus.message);
            }, true, 'submit-order');
        }
    }

    $scope.prePrint = function () {
        var printOrder = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder;
        printOrder.saleOrderCode = '';
        var setting = {
            companyInfo: $scope.userSession,
            allUsers: $scope.authBootloader.users,
            store: $scope.currentStore
        }
        if ($scope.isWebView) {
            var rs = printOrderInBrowser(printer, printOrder, 1, setting);
            if (rs) {
                audit(5, 'In hóa đơn tạm tính cho ' + printOrder.tableName + ', giá trị đơn hàng tạm tính là : ' + $filter('number')(printOrder.total, 0), '');
                toaster.pop('success', "", 'Đã in hoá đơn tạm tính.');
            } else {
                toaster.pop('error', "", 'Vui lòng kiểm tra lại mẫu in.');
            }
        } else if ($scope.isIOS && $scope.printDevice && $scope.printDevice.cashierPrinter.status && angular.isDefined(window.Suno)) {
            // console.log('in bep truc tiep tren IOS');
            printOrderInMobile($scope.printDevice.cashierPrinter, printOrder, "TT", setting);
            // printOrderInMobile($scope.printDevice.cashierPrinter.ip,printOrder,"TT",setting);
            audit(5, 'In hóa đơn tạm tính cho ' + printOrder.tableName + ', giá trị đơn hàng tạm tính là : ' + $filter('number')(printOrder.total, 0), '');
            toaster.pop('success', "", 'Đã in hoá đơn tạm tính.');
        } else if ($scope.isAndroid) {
            // console.log('in bep Android');
            printOrderInMobile($scope.printDevice.cashierPrinter, printOrder, "TT", setting);
            // printOrderInMobile($scope.printDevice.cashierPrinter.ip,printOrder,"TT",setting);
            audit(5, 'In hóa đơn tạm tính cho ' + printOrder.tableName + ', giá trị đơn hàng tạm tính là : ' + $filter('number')(printOrder.total, 0), '');
            toaster.pop('success', "", 'Đã in hoá đơn tạm tính.');
        }
    }

    // Lưu tables khi các giá trị đang watch có thay đổi

    //var watchExpressions = [
    //  "selectedItem.unitPrice",
    //  "selectedItem.discountIsPercent",
    //  "selectedItem.discount",
    //  "selectedItem.discountInPercent",
    //  "tableIsSelected.tableOrder",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.IsDiscountPercent",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.DiscountInPercent",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.discount",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].quantity",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].newOrderCount",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails[tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.lastInputedIndex].discount",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.customer",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.subFee",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.SubFeeInPercent",
    //  "tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.IsSubFeePercent"
    //];

    //$scope.$watchGroup(watchExpressions, function (newValue) {

    //    if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {

    //        repricingOrder($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder, $scope.isMultiplePrice);
    //    }

    //    // Tính toán số tiền giảm giá mỗi khi thay đổi phương thức giảm giá cho item trong đơn hàng
    //    if ($scope.selectedItem) {
    //        // console.log($scope.selectedItem.discount,$scope.selectedItem.discountIsPercent,$scope.selectedItem.discountInPercent);
    //        if ($scope.selectedItem.discountIsPercent) {
    //            if ($scope.selectedItem.discountInPercent > 100) $scope.selectedItem.discountInPercent = 100;
    //            $scope.selectedItem.discount = ($scope.selectedItem.unitPrice * $scope.selectedItem.discountInPercent) / 100;
    //        }
    //    }
    //    if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.IsSubFeePercent) {
    //        if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent = 0;
    //        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent > 100) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent = 100;
    //        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subFee = ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent * $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subTotal) / 100;

    //    }
    //    if ($scope.selectedItem && !$scope.selectedItem.discountIsPercent) {
    //        if ($scope.selectedItem.discount > $scope.selectedItem.unitPrice) $scope.selectedItem.discount = $scope.selectedItem.unitPrice;
    //    }
    //    // Tính giá bán cuối sau khi trừ giảm giá
    //    if ($scope.selectedItem && $scope.selectedItem.discount > 0) {
    //        $scope.selectedItem.sellPrice = $scope.selectedItem.unitPrice - $scope.selectedItem.discount;
    //    }
    //    if ($scope.selectedItem && $scope.selectedItem.discount == 0) $scope.selectedItem.sellPrice = $scope.selectedItem.unitPrice;


    //    if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.IsDiscountPercent) {
    //        if ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.DiscountInPercent > 100) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.DiscountInPercent = 100;
    //    }



    //    // Tính toán lại đơn hàng hiện tại, bổ sung thông tin thu ngân, người bán hàng vào đơn hàng.
    //    if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails.length > 0) {
    //        calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);

    //        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total;
    //        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.cashier = $scope.userSession.userId;
    //        if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleUser) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleUser = $scope.userInfo;
    //        if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.tableName) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.tableName = $scope.tableIsSelected.tableName;
    //        if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy) {
    //            $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdBy = $scope.userSession.userId;
    //            var saleUserIndex = findIndex($scope.authBootloader.users.userProfiles, 'userId', $scope.userSession.userId);
    //            $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.createdByName = $scope.authBootloader.users.userProfiles[saleUserIndex].displayName;
    //        }
    //        if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleOrderUuid) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleOrderUuid = uuid.v1();
    //        if (!$scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.storeId) $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.storeId = $scope.currentStore.storeID;
    //    }

    //    if ($scope.tables && $scope.tables.length > 0 && $scope.currentStore.storeID) {
    //        LSFactory.set($scope.currentStore.storeID, {
    //            tables: $scope.tables,
    //            zone: $scope.tableMap
    //        });
    //    }
    //});

    //$scope.$watchCollection("tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.orderDetails", function (newValue) {
    //    if ($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]) {
    //        calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
    //        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total;
    //    }

    //    if ($scope.tables && $scope.tables.length > 0 && $scope.currentStore.storeID) {
    //        LSFactory.set($scope.currentStore.storeID, {
    //            tables: $scope.tables,
    //            zone: $scope.tableMap
    //        });
    //    }
    //});

    //$scope.$watch("offline", function (n) {
    //    if (n)
    //        if (n.action == "submit-order")
    //            toaster.pop('error', "", 'Kết nối internet không ổn định hoặc đã mất kết nối internet, vui lòng lưu đơn hàng sau khi có internet trở lại!');
    //        else
    //            toaster.pop('error', "", 'Kết nối internet không ổn định hoặc đã mất kết nối internet, thao tác hiện không thể thực hiện được, vui lòng thử lại sau!');
    //    $scope.offline = null;
    //});

    //$scope.$watchCollection("receiptVoucher", function (n) {
    //    if ($scope.tableIsSelected && $scope.receiptVoucher.length > 0) {
    //        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.receiptVoucher = $scope.receiptVoucher;
    //        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].balance = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total - $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount;
    //    }
    //});

    //// $scope.$watch("tableIsSelected.tableOrder[orderIndexIsSelected].saleOrder.amountPaid",function(n){
    ////   // console.log($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
    ////   if($scope.tableIsSelected && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected] && $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.amountPaid >= $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total){
    ////     $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].paymentBalance = 0;
    ////   }
    //// });


    //$scope.$watch("receiptVoucher[0].amount", function (n) {
    //    if ($scope.tableIsSelected && $scope.receiptVoucher.length > 0 && $scope.receiptVoucher[0].amount > ($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total - $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.amountPaid)) {
    //        $scope.receiptVoucher[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total - $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.amountPaid;
    //    }
    //});

    $scope.openPopOverSaleList = function (e) {
        $ionicPopover.fromTemplateUrl('user-in-store-list.html', {
            scope: $scope
        }).then(function (popover) {
            $scope.popoverSaleList = popover;
            $scope.popoverSaleList.show(e);
        });
    }

    $scope.changeSale = function (s) {
        $scope.currentSale = s;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.saleUser = s;
        $scope.popoverSaleList.hide();
    }

    $scope.addSubFee = function () {
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.IsSubFeePercent = false;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent = 0;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subFee = 0;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subFeeName = 'Phụ thu';
    }

    $scope.removeSubFee = function () {
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subFee = null;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.subFeeName = null;

        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.IsSubFeePercent = null;
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.SubFeeInPercent = null;
        calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
    }

    $scope.openModalPrintedList = function () {
        $ionicModal.fromTemplateUrl('printed-list.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modalPrintedList = modal;
            $scope.modalPrintedList.show();
        });
    }

    $scope.closeModalPrintedList = function () {
        $scope.modalPrintedList.hide();
    }

    $scope.openEditTablesModal = function () {
        if ($scope.tableMap.length > 0) {
            if ($scope.popoverSettings) $scope.popoverSettings.hide();
            $scope.newTableMap = [];
            $scope.newTables = [];
            $scope.newTableMapTemp = [];
            $scope.newTableTemp = [];
            angular.copy($scope.tableMap, $scope.newTableMap);
            angular.copy($scope.tables, $scope.newTables);
            angular.copy($scope.tableMap, $scope.newTableMapTemp);
            angular.copy($scope.tables, $scope.newTableTemp);
            for (var x = 0; x < $scope.newTableMapTemp.length; x++) {
                $scope.newTableMap[x].unit2 = $scope.newTableMap[x].unit == 'Phòng' ? true : false;
                $scope.newTableMap[x].isUpdating = false;
                $scope.newTableMapTemp[x].unit2 = $scope.newTableMapTemp[x].unit == 'Phòng' ? true : false;
                $scope.newTableMapTemp[x].isUpdating = false;
            }

            $ionicModal.fromTemplateUrl('edit-tables.html', {
                scope: $scope,
                animation: 'slide-in-up',
                backdropClickToClose: false
            }).then(function (modal) {
                $scope.modalEditTables = modal;
                $scope.modalEditTables.show();
            });
        }
        else {
            $scope.modalCreateTables.show();
            if ($scope.popoverSettings) $scope.popoverSettings.hide();
        }
    }

    $scope.closeModalEditTables = function () {
        //$scope.modalEditTables.hide();
        $scope.updateTable();
    }

    //Kiểm tra đã lưu chưa và xác nhận ở màn hình Edit
    $scope.checkConfirmCloseEditModal = function () {
        if ($scope.newTableMap.length == $scope.tableMap.length) {
            var same = true;
            for (var x = 0; x < $scope.newTableMap.length; x++) {
                if ($scope.newTableMap[x].quantity != $scope.tableMap[x].quantity
                    || $scope.newTableMap[x].unit != $scope.tableMap[x].unit
                    || $scope.newTableMap[x].zone != $scope.tableMap[x].zone) {
                    same = false;
                }
            }
            if (same) {
                $scope.modalEditTables.hide();
                return;
            }
        }
    }

    //Kiểm tra đã lưu chưa và xác nhận ở màn hình Create
    $scope.checkConfirmCloseCreateModal = function () {
        //Trường hợp mảng tạm và mảng chỉnh bằng nhau.
        if ($scope.tableMap.length == $scope.tableMapTemp.length) {

        }
            //Trường hợp mảng tạm và mảng chính ko bằng nhau.
        else {
            console.log('Create - 2 arrays length are not same');
        }
    }

    $scope.editTableZoneEditTablesModal = function (index) {
        $scope.showEditTable = true;
        $scope.selectedZone = $scope.newTableMap[index];
        ($scope.selectedZone.unit == 'Bàn') ? $scope.selectedZone.toogle = false : $scope.selectedZone.toogle = true;
    }

    $scope.removeTableZoneEditTablesModal = function (index) {
        $scope.newTableMap.splice(index, 1);
        $scope.newTableMapTemp.splice(index, 1);
    }

    $scope.createTableZoneEditModal = function (z, q, u) {
        if (!q) {
            return toaster.pop('warning', "", 'Vui lòng nhập đủ thông tin cần thiết để tạo sơ đồ bàn.');
        }
        var t = {
            id: $scope.newTableMap.length,
            zone: z ? z : '',
            quantity: q,
            unit: u ? 'Phòng' : 'Bàn',
            isUpdating: false,
            unit2: u
        }
        $scope.modalEditTables.zone = null;
        $scope.modalEditTables.quantity = null;
        $scope.newTableMap.push(t);
        $scope.newTableMapTemp.push(angular.copy(t));
    }

    $scope.updateTable = function () {
        if ($scope.newTableMap.length > 0) {
            if ($scope.newTableMap.length == $scope.tableMap.length) {
                var same = true;
                for (var x = 0; x < $scope.newTableMap.length; x++) {
                    if ($scope.newTableMap[x].quantity != $scope.tableMap[x].quantity
                        || $scope.newTableMap[x].unit != $scope.tableMap[x].unit
                        || $scope.newTableMap[x].zone != $scope.tableMap[x].zone) {
                        same = false;
                    }
                }
                if (same) {
                    $scope.modalEditTables.hide();
                    return;
                }
            }
            $scope.newTables = [];
            $scope.count = 1;
            var tableTAW = {
                tableUuid: uuid.v1(),
                tableId: 0,
                tableIdInZone: 0,
                tableName: 'Mang về',
                tableZone: {},
                tableStatus: 0,
                tableOrder: [{
                    saleOrder: {
                        //lastSyncID: 0,
                        orderDetails: []
                    }
                }],
                startTime: null
            }
            angular.copy(saleOrder, tableTAW.tableOrder[0].saleOrder);
            $scope.newTables.push(tableTAW);

            for (var x = 0; x < $scope.newTableMap.length; x++) {
                if ($scope.newTableMap[x].hasOwnProperty('unit2')) {
                    delete $scope.newTableMap[x].unit2;
                }
                if ($scope.newTableMap[x].hasOwnProperty('isUpdating')) {
                    delete $scope.newTableMap[x].isUpdating;
                }
            }

            for (var i = 0; i < $scope.newTableMap.length; i++) {
                for (var j = 0; j < $scope.newTableMap[i].quantity; j++) {
                    var count = j + 1;
                    var t = {
                        tableUuid: uuid.v1(),
                        tableId: $scope.count++,
                        tableIdInZone: count,
                        tableName: $scope.newTableMap[i].unit + ' ' + count + ' - ' + $scope.newTableMap[i].zone,
                        tableZone: $scope.newTableMap[i],
                        tableStatus: 0,
                        tableOrder: [{
                            saleOrder: {
                                //lastSyncID: 0,
                                orderDetails: []
                            }
                        }],
                        startTime: null
                    }
                    angular.copy(saleOrder, t.tableOrder[0].saleOrder);
                    $scope.newTables.push(t);
                }
            }

            $scope.newTablesSetting = [];
            angular.copy($scope.tablesSetting, $scope.newTablesSetting);

            var storeIndex = findIndex($scope.newTablesSetting, 'storeId', $scope.currentStore.storeID);

            if (storeIndex != null) {
                $scope.newTablesSetting[storeIndex] = {
                    storeId: $scope.currentStore.storeID,
                    tables: $scope.newTables,
                    zone: $scope.newTableMap
                }
            } else {
                $scope.newTablesSetting.push({
                    storeId: $scope.currentStore.storeID,
                    tables: $scope.newTables,
                    zone: $scope.newTableMap
                });
            }

            // console.log($scope.newTablesSetting);
            var data = {
                "key": "tableSetting",
                "value": JSON.stringify($scope.newTablesSetting)
            }
            console.log(data);
            var url = Api.postKeyValue;

            asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
                if (data) {
                    toaster.pop('success', "Đã lưu sơ đồ bàn thành công!", 'Sơ đồ bàn sẽ được cập nhật sau khi bạn thực hiện kết ca cuối ngày.');
                    $scope.endSession();
                }
            }, function (error) {
                console.log(error)
            }, true, 'tableSetting');

            if ($scope.modalEditTables) $scope.modalEditTables.hide();

        } else {
            //console.log('tableMap', $scope.tableMap);
            //console.log('newTableMap', $scope.newTableMap);
            if ($scope.tableMap.length == 0) {
                $scope.modalEditTables.hide();
            }
            else {
                $scope.deleteTable();
            }
            //$scope.deleteTable();
            //toaster.pop('warning', "", 'Vui lòng nhập thông tin sơ đồ bàn!');
        }
    }

    $scope.deleteTable = function () {
        var data = {
            "key": "tableSetting",
            "value": ""
        }

        var url = Api.postKeyValue;

        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
            if (data) {
                toaster.pop('success', "Đã lưu sơ đồ bàn thành công!", 'Sơ đồ bàn sẽ được cập nhật sau khi bạn thực hiện kết ca cuối ngày.');
                if ($scope.modalEditTables) $scope.modalEditTables.hide();
                $scope.endSession();
            }
        }, function (error) {
            console.log(error)
        }, true, 'tableSetting');


    }

    $scope.showSyncSetting = function () {
        $scope.popoverSettings.hide();
        $ionicModal.fromTemplateUrl('sync-setting.html', {
            scope: $scope,
            animation: 'slide-in-up',
            // backdropClickToClose: false
        }).then(function (modal) {
            $scope.modalSyncSetting = modal;
            $scope.modalSyncSetting.show();
        });
    }

    $scope.closeSyncSetting = function () {
        $scope.modalSyncSetting.hide();
    }

    $scope.showSetting = function () {
        $scope.popoverSettings.hide();
        $scope.choice = $scope.removeSetting;
        $ionicModal.fromTemplateUrl('print-setting.html', {
            scope: $scope,
            animation: 'slide-in-up',
            // backdropClickToClose: false
        }).then(function (modal) {
            $scope.modalPrintSetting = modal;

            if ($scope.permissionIndex < 0 && !$scope.isWebView) {
                // nếu là nhân viên và đang ở web thì config là
                $scope.tabPrintSetting = 2;
            } else {
                $scope.tabPrintSetting = 1;
            }

            $scope.modalPrintSetting.show();
        });
    }

    $scope.closeSetting = function () {
        $scope.modalPrintSetting.hide();
    }

    $scope.savePrintSetting = function (setting, printHelper) {
        if (printHelper) {
            DBSettings.$getDocByID({ _id: 'printHelper' })
            .then(function (data) {
                if (data.docs.length > 0) {
                    DBSettings.$addDoc({ _id: 'printHelper', printHelper: data.docs[0].printHelper, _rev: data.docs[0]._rev })
                    .catch(function (error) {
                        console.log(error);
                    });
                }
                else {
                    DBSettings.$addDoc({ _id: 'printHelper', printHelper: data.docs[0].printHelper })
                    .catch(function (error) {
                        console.log(error);
                    });
                }
            })
            $scope.printHelper = printHelper;
            //window.localStorage.setItem('printHelper', JSON.stringify(printHelper));
            //$scope.printHelper = printHelper;
        }

        if ($scope.permissionIndex >= 0) {
            var s = {
                'printSubmitOrder': setting && setting.printSubmitOrder ? setting.printSubmitOrder : false,
                'printNoticeKitchen': setting && setting.printNoticeKitchen ? setting.printNoticeKitchen : false,
                'prePrint': setting && setting.prePrint ? setting.prePrint : false,
                'unGroupItem': setting && setting.unGroupItem ? setting.unGroupItem : false,
                'unGroupBarKitchen': setting && setting.unGroupBarKitchen ? setting.unGroupBarKitchen : false,
                'noticeByStamps': setting && setting.noticeByStamps ? setting.noticeByStamps : false
            };

            var data = {
                "key": "printSetting",
                "value": JSON.stringify(s)
            }

            var url = Api.postKeyValue;

            asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
                if (data) {
                    toaster.pop('success', "", 'Đã lưu thiết lập in cho cửa hàng!');
                    return $scope.modalPrintSetting.hide();
                }
            }, function (error) {
                console.log(error)
            }, true, 'savePrintSetting');
        } else {
            toaster.pop('success', "", 'Đã lưu thiết lập in cho cửa hàng!');
            return $scope.modalPrintSetting.hide();
        }
    }

    // angular.copy($scope.removeSetting,$scope.choice);
    $scope.openRemoveItemSettingModal = function () {
        $scope.popoverSettings.hide();
        $scope.choice = $scope.removeSetting;
        $ionicModal.fromTemplateUrl('remove-item-setting.html', {
            scope: $scope,
            animation: 'slide-in-up',
            // backdropClickToClose: false
        }).then(function (modal) {
            $scope.modalRemoveItemSetting = modal;
            $scope.modalRemoveItemSetting.show();
        });
    }

    $scope.closeRemoveItemSettingModal = function () {
        $scope.modalRemoveItemSetting.hide();
    }

    $scope.saveRemoveItemSetting = function (choice) {
        var data = {
            "key": "removeItemSetting",
            "value": JSON.stringify(choice)
        }

        var url = Api.postKeyValue;

        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
            if (data) {
                toaster.pop('success', "", 'Đã lưu thiết lập điều kiện huỷ món thành công!');
            }
        }, function (error) {
            console.log(error)
        }, true, 'setKeyValue');

        $scope.closeSetting();
    }

    $scope.savePrinterInfo = function (printDevice) {
        if (printDevice) {
            if ((printDevice.kitchenPrinter && printDevice.kitchenPrinter.status && printDevice.kitchenPrinter.ip == null) || (printDevice.cashierPrinter && printDevice.cashierPrinter.status && printDevice.cashierPrinter.ip == null)) {
                return toaster.pop('warning', "", 'Bạn chưa thiết lập địa chỉ máy in');
            }
            //window.localStorage.setItem('printDevice', JSON.stringify(printDevice));
            DBSettings.$getDocByID({ _id: 'printDevice' })
            .then(function (data) {
                if (data.docs.length > 0) {
                    DBSettings.$addDoc({ _id: 'printDevice', printDevice: printDevice, _rev: data.docs[0]._rev })
                    .catch(function (error) {
                        console.log(error);
                    });
                }
                else {
                    DBSettings.$addDoc({ _id: 'printDevice', printDevice: printDevice })
                    .catch(function (error) {
                        console.log(error);
                    });
                }
            });
            $scope.printDevice = printDevice;
            toaster.pop('success', "", 'Đã lưu thông tin máy in thành công!');
            $scope.closeSetting();
            //$scope.printDevice = printDevice;
            //toaster.pop('success', "", 'Đã lưu thông tin máy in thành công!');
            //$scope.closeSetting();
        }
    }

    $scope.showReportDetails = function (order) {
        if (order.isCollapse) {
            //Open
            order.isCollapse = false;
            if (order.details.length == 0) {
                //Call API to get Details Of Order
                var url = ApiUrl + 'sale/order?saleOrderId=' + order.id;
                asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data) {
                    if (data) {
                        order.details = data.saleOrder.orderDetails;
                    }
                }, function (error) {
                    toaster.pop('error', "", 'Lấy thông tin về chi tiết đơn hàng không thành công! Vui lòng thử lại');
                });
            }
        }
        else {
            //Collapse
            order.isCollapse = true;
        }
    };

    $scope.getStoreReport = function (from, to) {
        $scope.currentUserReport = null;
        if ($scope.popoverStaffList) $scope.popoverStaffList.hide();
        if (typeof from == 'undefined') from = null;
        if (typeof to == 'undefined') to = null;

        var deferred = $q.defer();
        var curr = new Date();
        var fromDate = from ? from.toJSON() : new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0).toJSON();
        var toDate = to ? to.toJSON() : new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 23, 59, 59, 0).toJSON();

        var url = Api.storeReport + 'limit=10000&fromDate=' + fromDate + '&toDate=' + toDate;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                $scope.reports = data;
                for (var x = 0; x < data.storeSales.length; x++) {
                    var item = $scope.reports.storeSales[x];
                    item.isCollapse = true;
                    item.details = [];
                };
                // console.log(data.storeSales,$scope.currentStore.storeID,$filter('filter')($scope.reports.storeSales,{'storeId' : $scope.currentStore.storeID}));
                $scope.reports.storeSales = $filter('filter')($scope.reports.storeSales, { 'storeId': $scope.currentStore.storeID });
                $scope.reports.storeExpenses = $filter('filter')($scope.reports.storeExpenses, { 'storeId': $scope.currentStore.storeID });
                $scope.reports.storePaidDebts = $filter('filter')($scope.reports.storePaidDebts, { 'storeId': $scope.currentStore.storeID });

                filterReportByStore($scope.reports);
                if ($scope.permissionIndex < 0) $scope.filterBySale($scope.userSession);
                deferred.resolve();
            }
        }, function (error) {
            console.log(error);
            deferred.reject("Có lỗi xảy ra!");
        }, true, 'storeReport');
        return deferred.promise;
    }

    $scope.getBalance = function () {
        var deferred = $q.defer();
        var url = Api.getKeyValue + 'getBalance=' + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                if (data.value != "") {
                    var rs = JSON.parse(data.value);
                    $scope.balance = rs;
                    // console.log(rs);
                } else {
                    $scope.balance = 0;
                }
                deferred.resolve();
            }
        }, function (error) {
            console.log(error);
            deferred.reject("Có lỗi xảy ra!");
        }, true, 'getBalance');
        return deferred.promise;
    }

    $scope.openStoreReport = function () {
        $scope.popoverSettings.hide();

        $ionicModal.fromTemplateUrl('store-report.html', {
            scope: $scope,
            animation: 'slide-in-up',
            // backdropClickToClose: false
        }).then(function (modal) {
            var curr = new Date();
            $scope.modalStoreReport = modal;
            $scope.modalStoreReport.fromDate = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0);
            $scope.modalStoreReport.toDate = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 23, 59, 59, 0);
            $scope.getStoreReport().then(function () {
                $scope.getBalance().then(function () {
                    $scope.modalStoreReport.show();
                    $scope.paymentMethod = { val: "1" };
                    $scope.selectPaymentMethod($scope.paymentMethod);
                    $scope.totalCash($scope.paymentMethod);
                });
            }, function () { });
        });
    }

    $scope.renewStoreReport = function (from, to) {
        $scope.getStoreReport(from, to).then(function () {
            $scope.getBalance().then(function () {
                $scope.modalStoreReport.show();
                $scope.paymentMethod = { val: "1" };
                $scope.selectPaymentMethod($scope.paymentMethod);
                $scope.totalCash($scope.paymentMethod);
            });
        }, function () { });
    }

    $scope.closeStoreReport = function () {
        $scope.modalStoreReport.hide();
    }

    $scope.viewChangeBalance = false;
    $scope.changeBalace = function () {
        $scope.viewChangeBalance = true;
    }

    $scope.updateBalance = function (balance) {
        $scope.viewChangeBalance = false;

        var data = {
            "key": "getBalance=" + $scope.currentStore.storeID,
            "value": JSON.stringify(balance)
        }

        var url = Api.postKeyValue;

        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
            if (data) {
                if ($scope.modalStoreReport){
                    $scope.modalStoreReport.hide();
                }
                toaster.pop('success', "", 'Đã cập nhật tồn quỹ đầu ca!');
            }
        }, function (error) {
            console.log(error)
        }, true, 'setBalance');
    }

    $scope.openPopOverStaffList = function (e) {
        $ionicPopover.fromTemplateUrl('staff-list.html', {
            scope: $scope
        }).then(function (popover) {
            $scope.popoverStaffList = popover;
            $scope.popoverStaffList.show(e);
        });
    }

    $scope.checkUserInStore = function (s) {
        var storeIndex = findIndex(s.userInStores, 'value', $scope.currentStore.storeID);
        if (storeIndex != null) {
            return true;
        }
        return false;
    }

    $scope.filterBySale = function (s) {
        $scope.currentUserReport = s;
        // $scope.cashier = {
        //   saleUserId : s.userId
        // }
        if (s) {
            var saleCount = 0;
            var saleTotal = 0;
            var cashTotal = 0;
            var cardTotal = 0;
            var debtTotal = 0;
            var discountTotal = 0;
            var subFeeTotal = 0;
            var totalExpense = 0;
            var totalPaidDebt = 0;
            var totalExpenseCash = 0;
            var totalPaidDebtCash = 0;

            for (var i = 0; i < $scope.reports.storeSales.length; i++) {
                var item = $scope.reports.storeSales[i];
                if (item.userId == s.userId) {
                    saleCount++;
                    saleTotal += item.total;
                    cashTotal += item.cashTotal;
                    cardTotal += item.cardTotal;
                    debtTotal += item.debtTotal;
                    discountTotal += item.discount;
                    subFeeTotal += item.subFee;
                }
            }

            for (var i = 0; i < $scope.reports.storeExpenses.length; i++) {
                var item = $scope.reports.storeExpenses[i];
                if (item.userId == s.userId) {
                    totalExpense += item.payment;
                    if (item.paymentMethodId == 1) totalExpenseCash += item.payment;
                }
            }

            for (var i = 0; i < $scope.reports.storePaidDebts.length; i++) {
                var item = $scope.reports.storePaidDebts[i];
                if (item.userId == s.userId) {
                    totalPaidDebt += item.amount;
                    if (item.paymentMethodId == 1) totalPaidDebtCash += item.amount;
                }
            }

            $scope.reports.totalPaidDebtCash = totalPaidDebtCash;
            $scope.reports.totalPaidDebt = totalPaidDebt;
            $scope.reports.totalExpense = totalExpense;
            $scope.reports.totalExpenseCash = totalExpenseCash;
            $scope.reports.saleCount = saleCount;
            $scope.reports.saleTotal = saleTotal;
            $scope.reports.cashTotal = cashTotal;
            $scope.reports.cardTotal = cardTotal;
            $scope.reports.debtTotal = debtTotal;
            $scope.reports.discountTotal = discountTotal;
            $scope.reports.subFeeTotal = subFeeTotal;
        }
        if ($scope.popoverStaffList) $scope.popoverStaffList.hide();
    }

    $scope.closeRemoveItemSetting = function () {
        $scope.modalRemoveItemSetting.hide();
    }

    $scope.endSession = function () {
        $ionicPopup.show({
            title: 'Kết ca cuối ngày',
            subTitle: 'Tất cả thông tin hóa đơn sẽ được xóa hết và tồn quỹ đầu ca sẽ được thiết lập về 0.',
            scope: $scope,
            buttons: [{
                text: 'Trở lại'
            }, {
                text: '<b>Xác nhận</b>',
                type: 'button-positive',
                onTap: function (e) {
                    //window.localStorage.removeItem($scope.currentStore.storeID);
                    Promise.all([
                        DBTables.$queryDoc({
                            selector: {
                                'store': { $eq: $scope.currentStore.storeID }
                            },
                        }),
                        DBSettings.$removeDoc({ _id: 'zones_' + $scope.userSession.companyId + '_' + $scope.currentStore.storeID })
                    ])
                    .then(function (data) {
                        data[0].docs.forEach(function (d) { d._deleted = true; });
                        return DBTables.$manipulateBatchDoc(data[0].docs);
                    })
                    .then(function (data) {
                        //debugger;
                        $scope.updateBalance(0);
                        audit(5, 'Kết ca cuối ngày', '');
                        if ($scope.modalStoreReport) $scope.modalStoreReport.hide();

                        // $state.reload();
                        toaster.pop('success', "", 'Đã hoàn thành kết ca cuối ngày!');
                        if (!$scope.isSync) {
                            window.location.reload(true);
                        }
                        else {
                            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                            .then(function (data) {
                                //debugger;
                                var shiftId = null;
                                if (data.docs.length > 0) {
                                    shiftId = data.docs[0].shiftId;
                                    DBSettings.$removeDoc({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                                    .then(function (data) {
                                        //console.log(data)
                                        //log for debugging.
                                    })
                                    .catch(function (error) { throw error }); //throw error to outer catch 
                                }
                                var completeShift = {
                                    "companyId": $scope.userSession.companyId,
                                    "storeId": $scope.currentStore.storeID,
                                    "clientId": $scope.clientId,
                                    "shiftId": shiftId, //LSFactory.get('shiftId')
                                }

                                completeShift = angular.toJson(completeShift);
                                completeShift = JSON.parse(completeShift);
                                console.log('completeShift', completeShift);
                                socket.emit('completeShift', completeShift);
                            })
                        }
                    })
                    .catch(function (error) {
                        console.log(error);
                    });

                    //if ($scope.isSync) {
                    //    DBSettings.$getDocByID({ _id: 'shiftId' })
                    //    .then(function (data) {
                    //        var shiftId = null;
                    //        if (data.docs.length > 0) {
                    //            shiftId = data.docs[0].shiftId;
                    //        }
                    //        var completeShift = {
                    //            "companyId": $scope.userSession.companyId,
                    //            "storeId": $scope.currentStore.storeID,
                    //            "clientId": $scope.clientId,
                    //            "shiftId": shiftId, //LSFactory.get('shiftId')
                    //        }

                    //        completeShift = angular.toJson(completeShift);
                    //        completeShift = JSON.parse(completeShift);
                    //        console.log('completeShift', completeShift);
                    //        socket.emit('completeShift', completeShift);
                    //    })
                    //    .catch(function (error) {
                    //        console.log(error);
                    //    });
                    //}

                }
            }]
        });
    }

    $scope.logout = function () {
        // localStorage.clear();
        //localStorage.removeItem('account');
        //localStorage.removeItem('bootloader');
        //localStorage.removeItem('setting');
        //localStorage.removeItem('store');
        //localStorage.removeItem('token');
        //localStorage.removeItem('user');
        Promise.all([
            DBSettings.$removeDoc({ _id: 'account' }),
            DBSettings.$removeDoc({ _id: 'bootloader' }),
            DBSettings.$removeDoc({ _id: 'setting' }),
            DBSettings.$removeDoc({ _id: 'store' }),
            DBSettings.$removeDoc({ _id: 'token' }),
            DBSettings.$removeDoc({ _id: 'user' }),
            DBSettings.$removeDoc({ _id: 'printDevice' }),
            DBSettings.$removeDoc({ _id: 'printHelper' })
        ]).then(function (data) {
            $scope.popoverSettings.hide();
            $state.go('login');
            $timeout(function () {
                $ionicHistory.clearCache();
            }, 200);
            window.location.reload(true);
        })
    }

    $scope.updateSyncSetting = function (isSync) {
        var data = {
            "key": "isSync",
            "value": JSON.stringify(isSync)
        }

        var url = Api.postKeyValue;

        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
            if (data) {
                var notification = isSync ? 'bật' : 'tắt';
                toaster.pop('success', "", 'Đã ' + notification + ' thiết lập đồng bộ.');

                if (isSync) {
                    // Nếu bật đồng bộ, đi kiểm tra tableUuid 
                    var count = 0;

                    for (var i = 0; i < $scope.tables.length; i++) {
                        if (!$scope.tables[i].tableUuid) {
                            count++;
                        }
                    }
                    if (count > 0) {
                        $scope.newTableMap = [];
                        angular.copy($scope.tableMap, $scope.newTableMap);
                        $scope.updateTable();
                    }

                } else {
                    // Nếu tắt đồng bộ
                    DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
                    .then(function (data) {
                        var shiftId = null;
                        if (data.docs.length > 0) {
                            shiftId = data.docs[0].shiftId;
                        }
                        var completeShift = {
                            "companyId": $scope.userSession.companyId,
                            "storeId": $scope.currentStore.storeID,
                            "clientId": $scope.clientId,
                            "shiftId": shiftId, //LSFactory.get('shiftId')
                        }

                        completeShift = angular.toJson(completeShift);
                        completeShift = JSON.parse(completeShift);
                        console.log('completeShift', completeShift);
                        socket.emit('completeShift', completeShift);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });

                    Promise.all([
                        DBSettings.$removeDoc({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID }),
                        DBTables.$queryDoc({
                            selector: {
                                'store': { $eq: $scope.currentStore.storeID }
                            },
                        })
                    ])
                    .then(function (data) {
                        data[1].docs.forEach(function (d) { d._deleted = true; });
                        returnDBTables.$manipulateBatchDoc(data[1].docs);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
                    //window.localStorage.removeItem($scope.currentStore.storeID);
                    //window.localStorage.removeItem('shiftId');

                }
                if ($scope.modalSyncSetting) $scope.modalSyncSetting.hide();
                window.location.reload(true);
            }
        }, function (error) {
            console.log(error)
        }, true, 'isSync');
    }

    $scope.stopCounter = function (item, $event) {

        var itemIndex = findIndex($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.orderDetails, 'itemId', item.itemId);
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.lastInputedIndex = itemIndex;

        item.endTime = new Date().getTime();
        item.timeCounter = Math.abs(item.endTime - item.startTime);

        var roundBlock = Math.ceil(item.timeCounter / (60000 * $scope.blockCounter));
        var roundCount = roundBlock * $scope.blockCounter * 60000;

        var hourCount = Math.floor(roundCount / 3600000);
        var minusCount = roundCount % 3600000;
        minusCount = Math.floor(minusCount / 60000);

        var hour = Math.floor(item.timeCounter / 3600000);
        var minus = item.timeCounter % 3600000;
        minus = Math.floor(minus / 60000);

        item.duration = hour + ' giờ ' + minus + ' phút';
        item.blockCount = hourCount + ' giờ ' + minusCount + ' phút';
        // console.log(item.duration,item.blockCount);
        item.quantity = Math.ceil(item.timeCounter / (60000 * $scope.blockCounter)) * ($scope.blockCounter / 60);
        item.timer = false;
        item.subTotal = item.quantity * item.sellPrice;
        calculateTotal($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder);
        $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.payments[0].amount = $scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected].saleOrder.total;
        if ($scope.tables && $scope.tables.length > 0 && $scope.currentStore.storeID) {
            updateTableToDB();
            //LSFactory.set($scope.currentStore.storeID, {
            //    tables: $scope.tables,
            //    zone: $scope.tableMap
            //});
        }
        if ($scope.isSync) {
            var curtentTable = {};
            angular.copy($scope.tableIsSelected, curtentTable);

            var currentTableOrder = [];
            currentTableOrder.push(curtentTable);
            currentTableOrder[0].tableOrder = [];
            currentTableOrder[0].tableOrder.push($scope.tableIsSelected.tableOrder[$scope.orderIndexIsSelected]);
            DBSettings.$getDocByID({ _id: 'shiftId' + "_" + $scope.userSession.companyId + "_" + $scope.currentStore.storeID })
            .then(function (data) {
                var shiftId = null;
                if (data.docs.length > 0) {
                    shiftId = data.docs[0].shiftId;
                }
                var updateData = {
                    "companyId": $scope.userSession.companyId,
                    "storeId": $scope.currentStore.storeID,
                    "clientId": $scope.clientId,
                    "shiftId": shiftId,//LSFactory.get('shiftId'),
                    "startDate": "",
                    "finishDate": "",
                    "tables": currentTableOrder,
                    "zone": $scope.tableMap
                }
                updateData = angular.toJson(updateData);
                updateData = JSON.parse(updateData);
                console.log('updateData', updateData);
                socket.emit('updateOrder', updateData);
            })
            .catch(function (error) {
                console.log(error);
            });
        }

        if ($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    };

    $scope.startCounter = function (item, $event) {
        if (!item.timer) {
            item.timer = true;
            if (!item.timeCounter) item.timeCounter = 0;
            if (!item.startTime) item.startTime = new Date().getTime();
        }
        if (item.startTime) {
            if ($scope.tables && $scope.tables.length > 0 && $scope.currentStore.storeID) {
                updateTableToDB();
                //LSFactory.set($scope.currentStore.storeID, {
                //    tables: $scope.tables,
                //    zone: $scope.tableMap
                //});
            }
        }
        if ($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    };

    $scope.search_product = function (key) {
        var url = Api.search + key + '&storeId=' + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            $scope.searchProductList = data.items;

        }, function (status) { console.log(status) }, true, 'SearchProductItem');
    }

    $scope.change_search = function (key) {
        if (!key) $scope.searchProductList = null;
    }

    $scope.addServiceProduct = function (i) {

        if (!$scope.hourService.itemArr) $scope.hourService.itemArr = [];
        var indexItem = findIndex($scope.hourService.itemArr, 'itemId', i.itemId);
        if (indexItem != null) {
            return toaster.pop('warning', "", 'Đã có hàng hóa này trong danh sách hàng hóa tính tiền theo giờ!');
        } else {
            $scope.hourService.itemArr.push(i);
            $scope.searchProductList = null;

        }

    }

    $scope.addBarItem = function (i) {

        if (!$scope.BarItemSetting) $scope.BarItemSetting = [];
        var indexItem = findIndex($scope.BarItemSetting, 'itemId', i.itemId);
        if (indexItem != null) {
            return toaster.pop('warning', "", 'Đã có hàng hóa này trong danh sách in bar!');
        } else {
            $scope.BarItemSetting.push(i);
            $scope.searchProductList = null;
        }

    }

    $scope.removeBarItem = function (index) {
        $scope.BarItemSetting.splice(index, 1);
    }

    $scope.removeServiceProduct = function (index) {
        $scope.hourService.itemArr.splice(index, 1);
    }

    $scope.openCategories = function () {
        $scope.showCategoriesItem = true;
    }

    $scope.closeCategories = function () {
        $scope.showCategoriesItem = false;
    }

    $scope.selectCategory = function (i) {
        var url = Api.productitems + 'categoryId=' + i.categoryID + '&limit=' + 1000 + '&pageIndex=' + 1 + '&storeId=' + $scope.currentStore.storeID;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            if (data) {
                if (!$scope.BarItemSetting) $scope.BarItemSetting = [];
                for (var j = 0; j < data.items.length; j++) {
                    var indexItem = findIndex($scope.BarItemSetting, 'itemId', data.items[j].itemId);
                    if (indexItem != null) { } else {
                        $scope.BarItemSetting.push(data.items[j]);
                    }
                }
            }
            $scope.closeCategories();
        }, function (error) {
            console.log(error)
        }, true, 'getProductItems');
    }

    $scope.saveBarItem = function () {
        var data = {
            "key": "BarItemSetting",
            "value": JSON.stringify($scope.BarItemSetting)
        }

        var url = Api.postKeyValue;

        asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
            if (data) {
                toaster.pop('success', "", 'Đã lưu thiết lập in bar!');

            }
        }, function (error) {
            console.log(error)
        }, true, 'saveHourServiceSetting');
    }

    $scope.saveServiceSetting = function (o) {
        if (o) {
            var data = {
                "key": "hourServiceSetting",
                "value": JSON.stringify(o)
            }

            var url = Api.postKeyValue;

            asynRequest($state, $http, 'POST', url, $scope.token.token, 'json', data, function (data, status) {
                if (data) {
                    $scope.hourService = o;
                    if ($scope.hourService && $scope.hourService.isUse) {
                        switch ($scope.hourService.optionSelected) {
                            case "1":
                                $scope.blockCounter = 15;
                                break;
                            case "2":
                                $scope.blockCounter = 30;
                                break;
                            case "3":
                                $scope.blockCounter = 60;
                                break;
                            case "0":
                                $scope.blockCounter = $scope.hourService.customOption;
                                break;
                        }
                    }
                    toaster.pop('success', "", 'Đã lưu thiết lập dịch vụ tính giờ!');
                    return $scope.closeSyncSetting();
                }
            }, function (error) {
                console.log(error)
            }, true, 'saveHourServiceSetting');
        }
    }

    $scope.rePrintOrder = function (o) {
        var url = Api.getOrderInfo + o.id;
        asynRequest($state, $http, 'GET', url, $scope.token.token, 'json', null, function (data, status) {
            var printOrder = data.saleOrder;
            var setting = {
                companyInfo: $scope.companyInfo.companyInfo,
                allUsers: $scope.authBootloader.users,
                store: $scope.currentStore
            }
            if ($scope.isWebView) {
                var rs = printOrderInBrowser(printer, printOrder, 1, setting);
                if (rs) {
                    toaster.pop('success', "", 'Đã in hoá đơn thành công.');
                } else {
                    toaster.pop('error', "", 'Vui lòng kiểm tra lại mẫu in.');
                }
            } else if ($scope.isIOS && $scope.printDevice && $scope.printDevice.cashierPrinter && $scope.printDevice.cashierPrinter.status && angular.isDefined(window.Suno)) {
                // console.log('in bep truc tiep tren IOS');
                printOrderInMobile($scope.printDevice.cashierPrinter, printOrder, "TT", setting);
                // printOrderInMobile($scope.printDevice.cashierPrinter.ip,printOrder,"TT",setting);
                toaster.pop('success', "", 'Đã in hoá đơn thành công.');
            } else if ($scope.isAndroid && $scope.printDevice && $scope.printDevice.cashierPrinter && $scope.printDevice.cashierPrinter.status && angular.isDefined(window.Suno)) {
                // console.log('in bep Android');
                printOrderInMobile($scope.printDevice.cashierPrinter, printOrder, "TT", setting);
                // printOrderInMobile($scope.printDevice.cashierPrinter.ip,printOrder,"TT",setting);
                toaster.pop('success', "", 'Đã in hoá đơn thành công.');
            }
            audit(5, 'In lại hóa đơn ' + printOrder.saleOrderCode + ', giá trị đơn hàng: ' + $filter('number')(printOrder.total, 0), '');
        }, function (status) { console.log(status) }, true, 'getOrderInfo');
    }

    $scope.totalCash = function (method) {
        if (method == "0") {
            total = $scope.reports.saleTotal - $scope.reports.debtTotal;
            totalPaidDebt = $scope.reports.totalPaidDebt;
            totalExpense = $scope.reports.totalExpense;
        } else if (method == "1") {
            total = $scope.reports.cashTotal;
            totalPaidDebt = $scope.reports.totalPaidDebtCash;
            totalExpense = $scope.reports.totalExpenseCash;
        } else {
            total = $scope.reports.cardTotal;
            totalPaidDebt = $scope.reports.totalPaidDebt - $scope.reports.totalPaidDebtCash;
            totalExpense = $scope.reports.totalExpense - $scope.reports.totalExpenseCash;
        }
        return parseFloat(total) + parseFloat($scope.balance) + parseFloat(totalPaidDebt) - parseFloat(totalExpense);
    }

    $scope.selectPaymentMethod = function (method) {

        var total = 0;
        var totalPaidDebt = 0;
        var totalExpense = 0;
        var totalExpense = 0;
        var totalPaidDebt = 0;
        $scope.balance ? $scope.balance : 0;

        if (method.val == "0") {
            $scope.reports.paymentMethod = 'Tất cả';
            $scope.reports.total = $scope.reports.saleTotal - $scope.reports.debtTotal;
        } else if (method.val == "1") {
            $scope.reports.paymentMethod = 'Tiền mặt';
            $scope.reports.total = $scope.reports.cashTotal;
        } else {
            $scope.reports.paymentMethod = 'Thẻ';
            $scope.reports.total = $scope.reports.cardTotal;
        }

        for (var i = 0; i < $scope.reports.storeExpenses.length; i++) {
            var item = $scope.reports.storeExpenses[i];
            if (parseInt(method.val) == item.paymentMethodId || parseInt(method.val) == 0) {
                totalExpense += item.payment
            }
        }

        for (var i = 0; i < $scope.reports.storePaidDebts.length; i++) {
            var item = $scope.reports.storePaidDebts[i];
            if (parseInt(method.val) == item.paymentMethodId || parseInt(method.val) == 0) {
                totalPaidDebt += item.amount
            }
        }

        $scope.reports.totalPaidDebt = totalPaidDebt;
        $scope.reports.totalExpense = totalExpense;
        $scope.reports.totalCash = $scope.totalCash(method.val);
        // console.log(parseFloat(total) + parseFloat($scope.balance) + parseFloat(totalPaidDebt) - parseFloat(totalExpense),parseFloat(total), parseFloat($scope.balance) , parseFloat(totalPaidDebt) , parseFloat(totalExpense));

    }

    $scope.printReport = function () {
        var setting = {
            companyInfo: $scope.companyInfo.companyInfo,
            allUsers: $scope.authBootloader.users,
            store: $scope.currentStore
        }
        $scope.reports.balance = $scope.balance;
        $scope.reports.fromDate = $scope.modalStoreReport.fromDate;
        $scope.reports.toDate = $scope.modalStoreReport.toDate;
        printReport(printer, $scope.reports, setting);
    }

    // HOTKEY
    if ($scope.isWebView) {
        hotkeys.add({
            combo: 'f10',
            description: 'Lưu và in',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            callback: function () {
                $scope.submitOrder(1);
            }
        });

        hotkeys.add({
            combo: 'f9',
            description: 'Báo bếp',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            callback: function () {
                $scope.noticeToTheKitchen();
            }
        });

        hotkeys.add({
            combo: 'f8',
            description: 'Mở thực đơn / sơ đồ bàn',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            callback: function () {
                $scope.switchLayout();
            }
        });

        hotkeys.add({
            combo: 'f7',
            description: 'Thêm hàng hóa F2',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            callback: function () {
                $scope.onSearchField = true;
                $scope.ItemIsSelected = {};
                $scope.hotkeyProduct();
            }
        });

        hotkeys.add({
            combo: 'right',
            description: 'Chuyển bàn / Chuyển món',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            callback: function () {
                $scope.isUseKeyboard = true;
                var fosuc = $('#productSearchInput').is(':focus');
                if (!fosuc && !$scope.onSearchField) {
                    $scope.selectItem(1);
                }
            }
        });

        hotkeys.add({
            combo: 'left',
            description: 'Chuyển bàn',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            callback: function () {
                $scope.isUseKeyboard = true;
                var fosuc = $('#productSearchInput').is(':focus');
                if (!fosuc && !$scope.onSearchField) {
                    $scope.selectItem(-1);
                }
            }
        });

        hotkeys.add({
            combo: 'enter',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            description: 'Chọn hàng hóa hoặc chọn bàn',
            callback: function () {
                var fosuc = $('#productSearchInput').is(':focus');
                if (!fosuc) {
                    $scope.hotkeySelect();
                }
            }
        });

        hotkeys.add({
            combo: 'down',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            description: 'Chọn hàng hóa',
            callback: function () {
                $scope.isUseKeyboard = true;
                var fosuc = $('#productSearchInput').is(':focus');
                if (fosuc) {
                    $('#productSearchInput').blur();
                }
                $scope.SelectItemWhenSearch(1);
            }
        });

        hotkeys.add({
            combo: 'up',
            allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
            description: 'Chọn hàng hóa',
            callback: function () {
                $scope.isUseKeyboard = true;
                var fosuc = $('#productSearchInput').is(':focus');
                if (fosuc) {
                    $('#productSearchInput').blur();
                }
                $scope.SelectItemWhenSearch(-1);
            }
        });

        hotkeys.add({
            combo: 'f4',
            allowIn: ['INPUT', 'BUTTON'],
            description: 'Chi tiết hóa đơn',
            callback: function () {
                $scope.openOrderDetails();
            }
        });
    }

    $scope.hotkeyProduct = function () {
        $("#productSearchInput").focus();
    };

    $scope.hotkeySelect = function () {
        if ($scope.isUseKeyboard) {
            if (!$scope.leftviewStatus && !$scope.onSearchField) {
                $scope.leftviewStatus = true;
            } else
            if ($scope.leftviewStatus && !$scope.onSearchField) {   //$scope.leftviewStatus && 
                //console.log('ItemIsSelected', $scope.ItemIsSelected);
                $scope.pickProduct($scope.ItemIsSelected);
            } else if ($scope.onSearchField) {
                //console.log($scope.ItemSearchIsSelected);
                $scope.pickProduct($scope.ItemSearchIsSelected);
                $scope.ItemSearchIsSelected = null;
                //$scope.onSearchField = false;
                $("#productSearchInput").focus()
            }
        }
    }

    $scope.tapInputSearch = function () {
        $scope.onSearchField = true;
    }

    $scope.isOnCustomerSearch = false;
    $scope.tapCustomerSearch = function () {
        $scope.onSearchField = false;
    }

    $scope.$on('modal.shown', function () {
        $scope.isUseKeyboard = false;
    });

    var scrollAcction = 0;
    $scope.SelectItemWhenSearch = function (offset) {

        if (!$scope.ItemSearchIsSelected && $scope.searchList) {
            $scope.ItemSearchIsSelected = $scope.searchList[0];
        }

        else if ($scope.searchList) {
            var itemIndex = findIndex($scope.searchList, 'itemId', $scope.ItemSearchIsSelected.itemId);
            if ((offset < 0 && itemIndex > 0) || (offset > 0 && itemIndex < $scope.searchList.length - 1))
                $scope.ItemSearchIsSelected = $scope.searchList[itemIndex + offset];
            // $scope.ItemSearchIsSelected = $scope.searchList[0]
            // console.log($scope.ItemSearchIsSelected);
            var p0 = document.getElementById('p0-' + $scope.ItemSearchIsSelected.itemId);
            var quotePosition = $ionicPosition.position(angular.element(p0));
            var delegate = $ionicScrollDelegate.$getByHandle('search-product-result');
            delegate.scrollTo(0, quotePosition.top, true);

        }
    }

    $scope.scrollAcction = 0;
    var screenHeight = $(window).height();

    $scope.selectItem = function (offset) {
        if (!$scope.leftviewStatus) {
            // Di chuyển chọn bàn
            var tableIndex = findIndex($scope.tables, 'tableUuid', $scope.tableIsSelected.tableUuid);
            if ((offset < 0 && tableIndex > 1) || (offset > 0 && tableIndex < $scope.tables.length - 1))
                $scope.openTable($scope.tables[tableIndex + offset]);
            $scope.leftviewStatus = false;

            var p1 = document.getElementById('p1-' + $scope.tableIsSelected.tableUuid);
            var quotePosition = $ionicPosition.position(angular.element(p1));

            if (offset > 0) {
                if (quotePosition.top > screenHeight - 151) {
                    // console.log(quotePosition.top,$scope.scrollAcction,quotePosition.top * $scope.scrollAcction);
                    $scope.scrollAcction++;
                    var delegate = $ionicScrollDelegate.$getByHandle('tables');
                    delegate.scrollTo(0, (screenHeight - 151) * $scope.scrollAcction, true);
                }
            } else if (offset < 0) {
                if (quotePosition.top < 0) {
                    // console.log(quotePosition.top,$scope.scrollAcction,quotePosition.top * $scope.scrollAcction);
                    $scope.scrollAcction--;
                    var delegate = $ionicScrollDelegate.$getByHandle('tables');
                    delegate.scrollTo(0, (screenHeight - 151) * $scope.scrollAcction, true);
                }
            }
        } else {
            // Di chuyển chọn món
            if (!$scope.ItemIsSelected) {
                $scope.ItemIsSelected = $scope.productItemList[0];
            } else {
                var itemIndex = findIndex($scope.productItemList, 'itemId', $scope.ItemIsSelected.itemId);
                if ((offset < 0 && itemIndex > 0) || (offset > 0 && itemIndex < $scope.productItemList.length - 1))
                    $scope.ItemIsSelected = $scope.productItemList[itemIndex + offset];

                // Cuộn màn hình theo item selected  
                var p2 = document.getElementById('p2-' + $scope.ItemIsSelected.itemId);
                var quotePosition = $ionicPosition.position(angular.element(p2));
                // console.log(angular.element(p2));
                if (offset > 0) {
                    if (quotePosition.top > screenHeight - 151) {
                        // console.log(quotePosition.top,$scope.scrollAcction,quotePosition.top * $scope.scrollAcction);
                        $scope.scrollAcction++;
                        var delegate = $ionicScrollDelegate.$getByHandle('productItemList');
                        delegate.scrollTo(0, (screenHeight - 151) * $scope.scrollAcction, true);

                    }
                } else if (offset < 0) {
                    if (quotePosition.top < 0) {
                        // console.log(quotePosition.top,$scope.scrollAcction,quotePosition.top * $scope.scrollAcction);
                        $scope.scrollAcction--;
                        var delegate = $ionicScrollDelegate.$getByHandle('productItemList');
                        delegate.scrollTo(0, (screenHeight - 151) * $scope.scrollAcction, true);
                    }
                }
            }
        }
    }

    $scope.confirmTableZoneEditing = function (index) {
        //Nếu xác nhận thì chép từ bản tạm qua bản chính.
        $scope.newTableMapTemp[index].isUpdating = false;
        $scope.newTableMapTemp[index].unit = $scope.newTableMapTemp[index].unit2 ? 'Phòng' : 'Bàn';
        $scope.newTableMap[index] = angular.copy($scope.newTableMapTemp[index]);
    };

    $scope.cancelTableZoneEditing = function (index) {
        //Nếu hủy thao tác thì chép từ bản chính qua bản tạm lại.
        $scope.newTableMapTemp[index] = angular.copy($scope.newTableMap[index]);
        $scope.newTableMapTemp[index].isUpdating = false;
    };

    $scope.removeAllTableZone = function () {
        $scope.newTableMap = [];
        $scope.newTableMapTemp = [];
    };

    $scope.removeAllInitTableZone = function () {
        $scope.tableMap = [];
        $scope.tableMapTemp = [];
    };

    $scope.confirmTableZoneInitializing = function (index) {
        $scope.tableMapTemp[index].isUpdating = false;
        $scope.tableMap[index] = angular.copy($scope.tableMapTemp[index]);
    };

    $scope.editTableZoneInitializing = function (index) {
        $scope.tableMapTemp[index].isUpdating = true;
    };

    $scope.cancelTableZoneInitializing = function (index) {
        $scope.tableMapTemp[index] = angular.copy($scope.tableMap[index]);
        $scope.tableMapTemp[index].isUpdating = false;
    };

    $scope.removeTableZoneInitializingTablesModal = function (index) {
        $scope.tableMapTemp[index].splice(index, 1);
        $scope.tableMap[index].splice(index, 1);
    };

    $scope.addTableZone = function (zone, quantity, unit) {
        if (!quantity) {
            return toaster.pop('warning', "", 'Vui lòng nhập đủ thông tin cần thiết để tạo sơ đồ bàn.');
        }
        var t = {
            id: $scope.tableMapTemp.length,
            zone: zone ? zone : '',
            quantity: quantity,
            unit: unit ? 'Phòng' : 'Bàn',
            isUpdating: false,
            unit2: unit
        };
        $scope.modalCreateTables.zone = null;
        $scope.modalCreateTables.quantity = null;
        $scope.tableMap.push(t);
        $scope.tableMapTemp.push(angular.copy(t));
    };

    $scope.closeCreateTableZone = function () {
        $scope.tableMapTemp = [];
        $scope.tableMap = [];
        $scope.modalCreateTables.hide();
    };

    $scope.closeEditTableZone = function () {
        $scope.modalEditTables.hide();
    };

    $scope.removeAll = function (item, $event) {
        $scope.selectedItem = item;
        $scope.checkRemoveItem(-$scope.selectedItem.quantity, $scope.selectedItem);
        $scope.selectedItem.changeQuantity = null;
        if ($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    };

    var updateTableToDB = function () {
        //console.log('fired');
        var id = $scope.tableIsSelected.tableId;
        var store = $scope.currentStore.storeID;
        var tableUuid = $scope.tableIsSelected.tableUuid;
        DBTables.$queryDoc({
            selector: {
                'store': { $eq: store },
                'tableUuid': { $eq: tableUuid }
            },
            fields: ['_id', '_rev']
        }).then(function (data) {
            //Check docs length để tránh trường hợp khi client dùng lần đầu tiên tạo phòng bàn thì tableIsSelected thay đổi
            //dẫn đến callback này gọi trong khi chưa có dữ liệu dưới DB Local gây lỗi _id of undefined.
            if(data.docs.length > 0){
                var table = JSON.parse(JSON.stringify($scope.tableIsSelected));
                table._id = data.docs[0]._id;
                table._rev = data.docs[0]._rev;
                table.store = store;
                return DBTables.$addDoc(table);
            }
            return null;
        }).then(function (data) {
            //console.log(data);
            return null;
        }).catch(function (error) {
            //Thử cập nhật lại thông tin của bàn đó sau khi cập nhật thất bại ở then thứ 1.
            //Do 2 watch Group và Collection đôi lúc chạy song song, nhưng trong PouchDB cập nhật phải có _rev.
            //Sau khi callback của 1 trong 2 watch trên đã cập nhật thì _rev sẽ bị thay đổi
            //Gây ra lỗi conflict _rev ở callback của watch chạy sau, do _rev đã cũ và ko tồn tại.
            //Khắc phục bằng cách thử gọi để lấy _rev mới sau đó cập nhật lại.
            return DBTables.$queryDoc({
                selector: {
                    'store': { $eq: store },
                    'tableUuid': { $eq: tableUuid }
                },
                fields: ['_id', '_rev']
            });
        }).then(function (data) {
            //Kiểm tra này để check trường hợp then thứ 1 thực hiện thành công ko nhảy vào catch 1 sẽ nhảy thẳng xuống then này
            //Gây ra lỗi Can not read property '...' of undefined. Ở then thứ 2 return null.
            if (data) { //&& data.docs && data.docs.length > 0) {
                var table = JSON.parse(JSON.stringify($scope.tableIsSelected));
                table._id = data.docs[0]._id;
                table._rev = data.docs[0]._rev;
                table.store = store;
                return DBTables.$addDoc(table);
            } else return null;
        }).catch(function (error) {
            console.log(error);
        });
    }
}
