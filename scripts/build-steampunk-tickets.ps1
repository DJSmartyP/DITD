Add-Type -AssemblyName System.Drawing

$ticketRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $ticketRoot 'assets/tickets'
$badge = [System.Drawing.Image]::FromFile((Join-Path $assetRoot 'ppec-explorers-club-badge.png'))

try {
  foreach ($variant in @('casual', 'timed')) {
    $artPath = Join-Path $assetRoot "bodach-bay-ticket-$variant-artwork.png"
    $outputPath = Join-Path $assetRoot "bodach-bay-ticket-$variant.png"
    $art = [System.Drawing.Image]::FromFile($artPath)
    $canvas = [System.Drawing.Bitmap]::new($art.Width, $art.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.DrawImage($art, 0, 0, $art.Width, $art.Height)
      # The exact supplied badge is composited, never redrawn or approximated.
      $graphics.DrawImage($badge, [System.Drawing.Rectangle]::new(135, 422, 250, 241))
      # Cover the generated bottom star with a small in-world brass gear.
      $tealBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 8, 47, 49))
      $goldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 184, 132, 54), 4)
      $goldBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 184, 132, 54))
      try {
        $graphics.FillEllipse($tealBrush, 866, 775, 70, 70)
        $graphics.DrawEllipse($goldPen, 870, 779, 62, 62)
        for ($spoke = 0; $spoke -lt 8; $spoke++) {
          $angle = $spoke * [Math]::PI / 4
          $innerX = 901 + [Math]::Cos($angle) * 14
          $innerY = 810 + [Math]::Sin($angle) * 14
          $outerX = 901 + [Math]::Cos($angle) * 26
          $outerY = 810 + [Math]::Sin($angle) * 26
          $graphics.DrawLine($goldPen, [float]$innerX, [float]$innerY, [float]$outerX, [float]$outerY)
        }
        $graphics.FillEllipse($goldBrush, 894, 803, 14, 14)
      } finally {
        $tealBrush.Dispose()
        $goldPen.Dispose()
        $goldBrush.Dispose()
      }
      $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output $outputPath
    } finally {
      $graphics.Dispose()
      $canvas.Dispose()
      $art.Dispose()
    }
  }
} finally {
  $badge.Dispose()
}
