import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

/// Основной экран: WebView занимает только безопасную зону (между статус-баром и индикатором «домой», над клавиатурой),
/// а вокруг — чёрный контейнер. Так фиксированные элементы страницы (меню, плееры, шапки) стоят на месте и не
/// «прыгают» при переходах, как это бывает при contentInset, а затемнение под статус-баром работает как на Android.
class MainViewController: CAPBridgeViewController {
    /// Отступ сверху = безопасная зона окна (статус-бар/«остров»); safeAreaLayoutGuide контейнера, подставленного
    /// после загрузки, мог остаться нулевым — страница уезжала под статус-бар.
    private lazy var topConstraint: NSLayoutConstraint = {
        guard let web = webView else { return view.topAnchor.constraint(equalTo: view.topAnchor) }
        return web.topAnchor.constraint(equalTo: view.topAnchor)
    }()

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let top = max(view.window?.safeAreaInsets.top ?? 0, view.safeAreaInsets.top)
        if topConstraint.constant != top { topConstraint.constant = top }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let web = webView else { return }
        let container = UIView()
        container.backgroundColor = .black
        web.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(web)
        if #available(iOS 17.0, *) { container.keyboardLayoutGuide.usesBottomSafeArea = false }
        view = container
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            topConstraint,
            // Без клавиатуры — низ экрана (под индикатором «домой» страница сама держит отступ через env(safe-area-inset-bottom));
            // с клавиатурой — поднимается над ней.
            web.bottomAnchor.constraint(equalTo: container.keyboardLayoutGuide.topAnchor),
        ])
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}
